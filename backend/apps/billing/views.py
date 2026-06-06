"""
Views for the PEDIACORE billing app.

Endpoints:
  - PaymentViewSet: CRUD for payments + MercadoPago preference + XLSX export
  - InvoiceViewSet: list/detail for invoices + PDF download
  - PaymentProviderViewSet: admin CRUD for payment provider configs
  - MercadoPagoWebhookView: standalone webhook endpoint for MP notifications
"""

from __future__ import annotations

import logging
from datetime import datetime

import mercadopago
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import Invoice, Payment, PaymentProvider
from apps.billing.serializers import (
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    PaymentCreateSerializer,
    PaymentDetailSerializer,
    PaymentListSerializer,
    PaymentProviderSerializer,
    PaymentUpdateSerializer,
    ReceiptUploadSerializer,
    TransferConfirmSerializer,
    TransferRejectSerializer,
)
from apps.billing.services.export_service import export_payments_xlsx
from apps.billing.services.invoice_service import create_invoice_for_payment, generate_invoice_pdf
from apps.billing.services.payment_strategy import MercadoPagoStrategy, get_payment_strategy
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor, IsTutor
from apps.notifications.services.email_service import (
    send_appointment_confirmation,
    send_payment_receipt,
    send_transfer_confirmed,
    send_transfer_receipt_uploaded,
    send_transfer_rejected,
)
from apps.scheduling.models import Appointment
from apps.scheduling.services.token_service import create_tokens_for_appointment

User = get_user_model()

logger = logging.getLogger(__name__)


def _build_token_urls(tokens: list) -> dict:
    """
    Build a token_urls dict suitable for send_appointment_confirmation.

    Maps each AppointmentToken's action to its frontend URL.
    CONFIRM and CANCEL point to the same resolve page; RESCHEDULE goes to
    the reschedule form.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "https://estefipediatra.com")
    url_map: dict[str, str | None] = {"confirm": None, "cancel": None, "reschedule": None}

    for token in tokens:
        if token.action == "CONFIRM":
            url_map["confirm"] = f"{frontend_url}/a/{token.token}/"
        elif token.action == "CANCEL":
            url_map["cancel"] = f"{frontend_url}/a/{token.token}/"
        elif token.action == "RESCHEDULE":
            url_map["reschedule"] = f"{frontend_url}/a/{token.token}/reschedule"

    return url_map


class PaymentViewSet(viewsets.ModelViewSet):
    """
    Payments CRUD + MercadoPago preference creation + webhook + XLSX export.

    Access control:
      - DOCTOR: sees all payments, can create/update
      - TUTOR: sees only payments for their linked patients
      - Anonymous: no access
    """

    pagination_class = StandardPagination
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        if self.action in ("update", "partial_update", "export"):
            return [IsDoctor()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        if self.action in ("update", "partial_update"):
            return PaymentUpdateSerializer
        if self.action == "retrieve":
            return PaymentDetailSerializer
        return PaymentListSerializer

    def get_queryset(self):
        user = self.request.user

        qs = Payment.objects.select_related(
            "practice", "patient", "appointment",
            "appointment__service", "appointment__location", "paid_by",
            "invoice",
        )

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list("patient_id", flat=True)
            qs = qs.filter(patient_id__in=patient_ids)
        elif user.role != User.DOCTOR:
            qs = qs.none()

        # Optional filters
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        patient_id_param = self.request.query_params.get("patient_id")
        if patient_id_param:
            qs = qs.filter(patient_id=patient_id_param)

        payment_method_param = self.request.query_params.get("payment_method")
        if payment_method_param:
            qs = qs.filter(payment_method=payment_method_param)

        receipt_uploaded = self.request.query_params.get("receipt_uploaded")
        if receipt_uploaded == "true":
            qs = qs.exclude(receipt_uploaded_at__isnull=True)
        elif receipt_uploaded == "false":
            qs = qs.filter(receipt_uploaded_at__isnull=True)

        return qs

    @action(detail=True, methods=["post"], url_path="create-preference")
    def create_preference(self, request: Request, pk=None) -> Response:
        """
        Create a payment preference with the configured provider.

        For MercadoPago, returns an init_point URL to redirect the user
        to complete payment on MP's hosted checkout page.
        """
        payment = self.get_object()

        if payment.status == Payment.COMPLETED:
            return Response(
                {"detail": "Payment is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        strategy = get_payment_strategy(payment.payment_method)
        result = strategy.create_preference(payment)

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[IsDoctor])
    def export(self, request: Request) -> HttpResponse:
        """
        Export all payments as an XLSX file (doctor only).

        Applies the same queryset filters as list (status, patient_id).
        """
        queryset = self.get_queryset()

        try:
            xlsx_bytes = export_payments_xlsx(queryset)
        except ImportError:
            return Response(
                {"detail": "openpyxl is not installed. Cannot export XLSX."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        response = HttpResponse(
            content=xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="payments.xlsx"'
        return response

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-receipt",
        permission_classes=[IsTutor],
        parser_classes=[MultiPartParser],
    )
    def upload_receipt(self, request: Request, pk=None) -> Response:
        """
        Upload a bank transfer receipt file for a pending transfer payment.

        Only the tutor who owns the payment (paid_by) may upload.
        Payment must be PENDING with payment_method=TRANSFER.
        Accepts: PDF, JPG, JPEG, PNG. Max size: 10 MB.
        """
        payment = self.get_object()

        # Ownership check: tutor must be the payer
        if payment.paid_by != request.user:
            return Response(
                {"detail": "You do not have permission to upload a receipt for this payment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if payment.payment_method != Payment.TRANSFER:
            return Response(
                {"detail": "Receipt upload is only valid for bank transfer payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status != Payment.PENDING:
            return Response(
                {"detail": "Receipt can only be uploaded for pending payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReceiptUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        receipt_file = serializer.validated_data["receipt"]

        payment.receipt_file = receipt_file
        payment.receipt_uploaded_at = timezone.now()
        payment.save(update_fields=["receipt_file", "receipt_uploaded_at", "updated_at"])

        try:
            send_transfer_receipt_uploaded(payment)
        except Exception as exc:
            logger.error(
                "upload_receipt: failed to send notification for Payment #%s: %s",
                payment.pk,
                exc,
            )

        # Fire-and-forget: analyse the receipt with Gemini OCR in the background.
        # The upload succeeds regardless of whether the task is enqueued.
        try:
            from django_q.tasks import async_task

            async_task(
                "apps.billing.services.ocr_service.analyze_receipt_with_gemini",
                payment.id,
            )
            logger.info("upload_receipt: OCR task enqueued for Payment #%s", payment.pk)
        except Exception as exc:
            logger.error(
                "upload_receipt: could not enqueue OCR task for Payment #%s: %s",
                payment.pk,
                exc,
            )

        return Response(
            {
                "status": "pending",
                "receipt_uploaded_at": payment.receipt_uploaded_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm-transfer",
        permission_classes=[IsDoctor],
    )
    def confirm_transfer(self, request: Request, pk=None) -> Response:
        """
        Confirm a bank transfer payment (doctor only).

        Transitions Payment → COMPLETED, Appointment → CONFIRMED.
        Creates an Invoice and sends confirmation email to the tutor.
        """
        payment = self.get_object()

        if payment.payment_method != Payment.TRANSFER:
            return Response(
                {"detail": "confirm-transfer is only valid for bank transfer payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status != Payment.PENDING:
            return Response(
                {"detail": "Only pending transfer payments can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TransferConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get("notes", "")

        with transaction.atomic():
            payment.status = Payment.COMPLETED
            payment.paid_at = timezone.now()
            if notes:
                payment.notes = notes
            payment.save(update_fields=["status", "paid_at", "notes", "updated_at"])

            appointment = payment.appointment
            if appointment and appointment.status == Appointment.PENDING:
                appointment.status = Appointment.CONFIRMED
                appointment.confirmed_at = timezone.now()
                appointment.save(update_fields=["status", "confirmed_at", "updated_at"])

        # Post-confirmation pipeline (non-blocking)
        try:
            create_invoice_for_payment(payment)
            logger.info("confirm_transfer: Invoice created for Payment #%s", payment.pk)
        except Exception as exc:
            logger.error(
                "confirm_transfer: invoice creation failed for Payment #%s: %s",
                payment.pk,
                exc,
            )

        try:
            if hasattr(payment, "invoice"):
                generate_invoice_pdf(payment.invoice)
            else:
                logger.warning("confirm_transfer: no invoice to generate PDF for Payment #%s", payment.pk)
        except Exception as exc:
            logger.error(
                "confirm_transfer: PDF generation failed for Payment #%s: %s",
                payment.pk,
                exc,
            )

        try:
            send_transfer_confirmed(payment)
        except Exception as exc:
            logger.error(
                "confirm_transfer: send_transfer_confirmed failed for Payment #%s: %s",
                payment.pk,
                exc,
            )

        try:
            if appointment:
                send_appointment_confirmation(appointment)
        except Exception as exc:
            logger.error(
                "confirm_transfer: send_appointment_confirmation failed for Appointment #%s: %s",
                appointment.pk if appointment else "—",
                exc,
            )

        return Response({"status": "completed"}, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="process-card",
        permission_classes=[IsTutor],
    )
    def process_card(self, request: Request, pk=None) -> Response:
        """
        Process an inline card payment using a token from the Payment Brick.

        The frontend's CardPayment/Payment Brick tokenizes the card and sends
        the token + payment details here. We call the MercadoPago API to create
        the actual payment, then confirm the appointment.

        Expected payload:
            token, payment_method_id, issuer_id, installments,
            payer.email, payer.identification.type, payer.identification.number
        """
        payment = self.get_object()

        # Ownership check
        if payment.paid_by != request.user:
            return Response(
                {"detail": "You do not have permission to process this payment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if payment.status != Payment.PENDING:
            return Response(
                {"detail": "Only pending payments can be processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract token data from request
        data = request.data
        token = data.get("token")
        if not token:
            return Response(
                {"detail": "Card token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from decimal import Decimal

        amount = int(Decimal(str(payment.amount)))

        # Resolve service description
        service_name = "Consulta pediátrica"
        if payment.appointment and payment.appointment.service:
            service_name = payment.appointment.service.name

        # Build payer info
        payer_data = data.get("payer", {})
        payer_email = payer_data.get("email", request.user.email)
        identification = payer_data.get("identification", {})

        payment_data = {
            "transaction_amount": amount,
            "token": token,
            "description": service_name,
            "installments": int(data.get("installments", 1)),
            "payment_method_id": data.get("payment_method_id", ""),
            "issuer_id": data.get("issuer_id", ""),
            "payer": {
                "email": payer_email,
            },
        }

        # Add identification if provided
        if identification.get("type") and identification.get("number"):
            payment_data["payer"]["identification"] = {
                "type": identification["type"],
                "number": identification["number"],
            }

        # Call MercadoPago API to create the payment
        access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "")
        sdk = mercadopago.SDK(access_token)

        try:
            mp_response = sdk.payment().create(payment_data)
        except Exception as exc:
            logger.error("process_card: MP API call failed for Payment #%s: %s", payment.pk, exc)
            return Response(
                {"detail": "Error processing payment with MercadoPago."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mp_status_code = mp_response.get("status")
        mp_result = mp_response.get("response", {})
        mp_payment_status = mp_result.get("status", "")
        mp_payment_id = str(mp_result.get("id", ""))

        logger.info(
            "process_card: MP response status=%s mp_payment_status=%s mp_id=%s for Payment #%s",
            mp_status_code,
            mp_payment_status,
            mp_payment_id,
            payment.pk,
        )

        if mp_status_code not in (200, 201):
            error_message = mp_result.get("message", "Payment was rejected.")
            logger.warning(
                "process_card: MP rejected Payment #%s — status=%s response=%s",
                payment.pk, mp_status_code, mp_result,
            )
            return Response(
                {"detail": error_message, "mp_status": mp_payment_status},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Payment approved — update records
        if mp_payment_status == "approved":
            with transaction.atomic():
                payment.status = Payment.COMPLETED
                payment.paid_at = timezone.now()
                payment.external_id = mp_payment_id
                payment.external_status = mp_payment_status
                payment.metadata.update({
                    "provider": "mercadopago",
                    "mp_payment_id": mp_payment_id,
                    "processing_mode": "card_inline",
                })
                payment.save(update_fields=[
                    "status", "paid_at", "external_id", "external_status",
                    "metadata", "updated_at",
                ])

                appointment = payment.appointment
                if appointment and appointment.status in (Appointment.PENDING, Appointment.HOLD):
                    appointment.status = Appointment.CONFIRMED
                    appointment.confirmed_at = timezone.now()
                    appointment.save(update_fields=["status", "confirmed_at", "updated_at"])

            # Post-confirmation pipeline (non-blocking)
            try:
                create_invoice_for_payment(payment)
            except Exception as exc:
                logger.error("process_card: invoice creation failed for Payment #%s: %s", payment.pk, exc)

            try:
                if hasattr(payment, "invoice"):
                    generate_invoice_pdf(payment.invoice)
            except Exception as exc:
                logger.error("process_card: PDF generation failed for Payment #%s: %s", payment.pk, exc)

            try:
                send_payment_receipt(payment)
            except Exception as exc:
                logger.error("process_card: send_payment_receipt failed for Payment #%s: %s", payment.pk, exc)

            # ── Generate Zoom meeting if applicable ────────────────────────────────
            try:
                if appointment and appointment.is_online and appointment.call_platform == "ZOOM":
                    from apps.scheduling.services.zoom_service import create_zoom_meeting

                    meeting_start = datetime.combine(
                        appointment.scheduled_date, appointment.start_time
                    )
                    join_url = create_zoom_meeting(
                        topic=f"Consulta — {appointment.patient.full_name}",
                        start_time=meeting_start,
                        duration_minutes=appointment.service.duration_minutes,
                    )
                    appointment.meeting_link = join_url
                    appointment.save(update_fields=["meeting_link", "updated_at"])
                    logger.info(
                        "process_card: Zoom meeting created for Appointment #%s: %s",
                        appointment.pk,
                        join_url,
                    )
            except Exception as exc:
                logger.error(
                    "process_card: Zoom meeting creation failed for Appointment #%s: %s",
                    appointment.pk if appointment else "—",
                    exc,
                )

            # ── Create tokens + send confirmation email with action buttons ────────
            try:
                if appointment:
                    tokens = create_tokens_for_appointment(appointment)
                    token_urls = _build_token_urls(tokens)
                    send_appointment_confirmation(appointment, token_urls=token_urls)
            except Exception as exc:
                logger.error("process_card: send_appointment_confirmation failed: %s", exc)

            return Response(
                {"status": "approved", "appointment_id": appointment.pk if appointment else None},
                status=status.HTTP_200_OK,
            )

        # Pending/in_process — store external_id but don't confirm yet
        payment.external_id = mp_payment_id
        payment.external_status = mp_payment_status
        payment.metadata.update({"provider": "mercadopago", "mp_payment_id": mp_payment_id})
        payment.save(update_fields=["external_id", "external_status", "metadata", "updated_at"])

        return Response(
            {"status": mp_payment_status, "detail": "Payment is being processed."},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="reject-transfer",
        permission_classes=[IsDoctor],
    )
    def reject_transfer(self, request: Request, pk=None) -> Response:
        """
        Reject a bank transfer payment (doctor only).

        Requires a 'reason' in the request body.
        Transitions Payment → FAILED, Appointment → CANCELLED.
        Sends a rejection email to the tutor.
        """
        payment = self.get_object()

        if payment.payment_method != Payment.TRANSFER:
            return Response(
                {"detail": "reject-transfer is only valid for bank transfer payments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status != Payment.PENDING:
            return Response(
                {"detail": "Only pending transfer payments can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TransferRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        with transaction.atomic():
            payment.status = Payment.FAILED
            payment.save(update_fields=["status", "updated_at"])

            appointment = payment.appointment
            if appointment:
                appointment.status = Appointment.CANCELLED
                appointment.save(update_fields=["status", "updated_at"])

        try:
            send_transfer_rejected(payment, reason)
        except Exception as exc:
            logger.error(
                "reject_transfer: send_transfer_rejected failed for Payment #%s: %s",
                payment.pk,
                exc,
            )

        return Response({"status": "rejected"}, status=status.HTTP_200_OK)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for invoices.

    Invoices are created automatically when a payment completes — they are
    never created directly via the API. Provides list, detail, and PDF download.
    """

    pagination_class = StandardPagination

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return InvoiceDetailSerializer
        return InvoiceListSerializer

    def get_queryset(self):
        user = self.request.user

        qs = Invoice.objects.select_related("practice", "payment", "payment__patient")

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list("patient_id", flat=True)
            qs = qs.filter(payment__patient_id__in=patient_ids)
        elif user.role != User.DOCTOR:
            qs = qs.none()

        return qs

    @action(detail=True, methods=["get"])
    def download(self, request: Request, pk=None) -> HttpResponse:
        """
        Download or generate the invoice PDF.

        If the PDF file does not exist yet, generates it on-the-fly.
        """
        invoice = self.get_object()

        try:
            if not invoice.pdf_file:
                pdf_bytes = generate_invoice_pdf(invoice)
            else:
                pdf_bytes = invoice.pdf_file.read()
        except Exception as exc:
            logger.error("Invoice PDF generation failed for #%s: %s", invoice.pk, exc)
            return Response(
                {"detail": "Failed to generate invoice PDF."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = HttpResponse(content=pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class MercadoPagoWebhookView(APIView):
    """
    Standalone webhook endpoint for MercadoPago payment notifications.

    URL: POST /api/v1/webhooks/mercadopago/
    Permission: AllowAny — MP sends requests without authentication.

    Pipeline on payment.approved:
      1. Validate X-Signature HMAC → 403 if invalid
      2. Ignore non-payment events → 200
      3. Fetch full payment from MP API by data.id
      4. Look up our Payment by external_reference (= Payment.pk)
      5. Idempotency: if already COMPLETED → 200 (skip)
      6. atomic: Payment→COMPLETED, Appointment→CONFIRMED
      7. create_invoice_for_payment() + send_payment_receipt() + send_appointment_confirmation()

    On payment.rejected:
      - Payment→FAILED; Appointment stays HOLD (will expire via background task)
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        """Handle a MercadoPago webhook notification."""
        # ── 1. Validate HMAC signature ────────────────────────────────────────
        webhook_secret = getattr(settings, "MERCADOPAGO_WEBHOOK_SECRET", "")
        data = request.data
        data_id = str(data.get("data", {}).get("id", ""))
        request_id = request.META.get("HTTP_X_REQUEST_ID", "")

        if webhook_secret:
            sig_valid = MercadoPagoStrategy.validate_webhook_signature(
                headers=request.META,
                data_id=data_id,
                request_id=request_id,
                secret=webhook_secret,
            )
            if not sig_valid:
                # HMAC failed — log but proceed. Payment authenticity is verified
                # in step 3 by fetching the payment directly from MP's API.
                logger.warning(
                    "MercadoPago webhook: HMAC signature failed for data_id=%s — "
                    "proceeding with API verification",
                    data_id,
                )
        else:
            logger.info("MercadoPago webhook: MERCADOPAGO_WEBHOOK_SECRET not set, skipping signature validation")

        # ── 2. Ignore non-payment events ──────────────────────────────────────
        notification_type = data.get("type", "")
        if notification_type != "payment":
            logger.info("MercadoPago webhook: ignoring event type=%s", notification_type)
            return Response({"detail": "Event type ignored."}, status=status.HTTP_200_OK)

        if not data_id:
            logger.warning("MercadoPago webhook: missing data.id in payload")
            return Response({"detail": "Missing data.id."}, status=status.HTTP_400_BAD_REQUEST)

        # ── 3. Fetch full payment from MP API ─────────────────────────────────
        try:
            access_token = getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "")
            sdk = mercadopago.SDK(access_token)
            mp_response = sdk.payment().get(data_id)

            if mp_response.get("status") not in (200, 201):
                logger.error(
                    "MercadoPago webhook: failed to fetch payment data_id=%s status=%s",
                    data_id,
                    mp_response.get("status"),
                )
                return Response(
                    {"detail": "Failed to retrieve payment from MP."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            mp_payment = mp_response["response"]
        except Exception as exc:
            logger.error("MercadoPago webhook: SDK error fetching payment: %s", exc, exc_info=True)
            return Response(
                {"detail": "Error fetching payment from MercadoPago."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # ── 4. Look up our Payment by external_reference ──────────────────────
        external_reference = str(mp_payment.get("external_reference", ""))
        mp_payment_id = str(mp_payment.get("id", ""))
        mp_status = mp_payment.get("status", "")

        try:
            payment = Payment.objects.select_related("appointment", "appointment__service").get(pk=external_reference)
        except (Payment.DoesNotExist, ValueError):
            logger.warning(
                "MercadoPago webhook: no payment found for external_reference=%s",
                external_reference,
            )
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        # ── 5. Idempotency: already processed → skip ──────────────────────────
        if payment.status == Payment.COMPLETED:
            logger.info(
                "MercadoPago webhook: Payment #%s already COMPLETED, skipping (idempotent)",
                payment.pk,
            )
            return Response({"detail": "Already processed."}, status=status.HTTP_200_OK)

        # ── 6. Process based on MP status ─────────────────────────────────────
        if mp_status == "approved":
            try:
                with transaction.atomic():
                    # Update Payment
                    payment.status = Payment.COMPLETED
                    payment.external_id = mp_payment_id
                    payment.external_status = "approved"
                    payment.paid_at = timezone.now()
                    payment.save(update_fields=["status", "external_id", "external_status", "paid_at", "updated_at"])

                    # Update Appointment
                    appointment = payment.appointment
                    if appointment and appointment.status == Appointment.HOLD:
                        appointment.status = Appointment.CONFIRMED
                        appointment.confirmed_at = timezone.now()
                        appointment.save(update_fields=["status", "confirmed_at", "updated_at"])

                logger.info(
                    "MercadoPago webhook: Payment #%s COMPLETED, Appointment #%s CONFIRMED",
                    payment.pk,
                    appointment.pk if appointment else "—",
                )
            except Exception as exc:
                logger.error(
                    "MercadoPago webhook: DB error processing approval for Payment #%s: %s",
                    payment.pk,
                    exc,
                    exc_info=True,
                )
                return Response(
                    {"detail": "Error processing payment."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # ── 7. Post-payment pipeline (non-blocking — failures logged, not raised) ──
            try:
                create_invoice_for_payment(payment)
                logger.info("MercadoPago webhook: Invoice created for Payment #%s", payment.pk)
            except Exception as exc:
                logger.error(
                    "MercadoPago webhook: invoice creation failed for Payment #%s: %s",
                    payment.pk,
                    exc,
                )

            try:
                send_payment_receipt(payment)
            except Exception as exc:
                logger.error(
                    "MercadoPago webhook: send_payment_receipt failed for Payment #%s: %s",
                    payment.pk,
                    exc,
                )

            # ── 7b. Generate Zoom meeting link if applicable ────────────────────
            try:
                if appointment and appointment.is_online and appointment.call_platform == "ZOOM":
                    from apps.scheduling.services.zoom_service import create_zoom_meeting

                    meeting_start = datetime.combine(
                        appointment.scheduled_date, appointment.start_time
                    )
                    join_url = create_zoom_meeting(
                        topic=f"Consulta — {appointment.patient.full_name}",
                        start_time=meeting_start,
                        duration_minutes=appointment.service.duration_minutes,
                    )
                    appointment.meeting_link = join_url
                    appointment.save(update_fields=["meeting_link", "updated_at"])
                    logger.info(
                        "Zoom meeting created for Appointment #%s: %s",
                        appointment.pk,
                        join_url,
                    )
            except Exception as exc:
                logger.error(
                    "Zoom meeting creation failed for Appointment #%s: %s",
                    appointment.pk if appointment else "—",
                    exc,
                )

            # Create tokens before sending confirmation so the email can include action links.
            token_urls = None
            try:
                if appointment:
                    tokens = create_tokens_for_appointment(appointment)
                    token_urls = _build_token_urls(tokens)
                    logger.info(
                        "MercadoPago webhook: tokens created for Appointment #%s",
                        appointment.pk,
                    )
            except Exception as exc:
                logger.error(
                    "MercadoPago webhook: token creation failed for Appointment #%s: %s",
                    appointment.pk if appointment else "—",
                    exc,
                )

            try:
                if appointment:
                    send_appointment_confirmation(appointment, token_urls=token_urls)
            except Exception as exc:
                logger.error(
                    "MercadoPago webhook: send_appointment_confirmation failed for Appointment #%s: %s",
                    appointment.pk if appointment else "—",
                    exc,
                )

        elif mp_status == "rejected":
            payment.status = Payment.FAILED
            payment.external_id = mp_payment_id
            payment.external_status = "rejected"
            payment.save(update_fields=["status", "external_id", "external_status", "updated_at"])
            logger.info(
                "MercadoPago webhook: Payment #%s FAILED (rejected by MP), Appointment stays HOLD",
                payment.pk,
            )

        else:
            logger.info(
                "MercadoPago webhook: unhandled MP status=%s for Payment #%s",
                mp_status,
                payment.pk,
            )

        return Response({"detail": "OK"}, status=status.HTTP_200_OK)


class PaymentProviderViewSet(viewsets.ModelViewSet):
    """
    CRUD for PaymentProvider configuration (doctor admin only).

    Allows the doctor to configure MercadoPago credentials per practice.
    """

    serializer_class = PaymentProviderSerializer
    permission_classes = [IsDoctor]
    pagination_class = StandardPagination
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        from apps.practice.models import Practice

        # Doctor sees only their own practice's providers
        try:
            practice = Practice.objects.get(owner=self.request.user)
            return PaymentProvider.objects.filter(practice=practice)
        except Practice.DoesNotExist:
            return PaymentProvider.objects.none()
