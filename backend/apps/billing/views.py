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

import mercadopago
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
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
)
from apps.billing.services.export_service import export_payments_xlsx
from apps.billing.services.invoice_service import create_invoice_for_payment, generate_invoice_pdf
from apps.billing.services.payment_strategy import MercadoPagoStrategy, get_payment_strategy
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor
from apps.notifications.services.email_service import send_appointment_confirmation, send_payment_receipt
from apps.scheduling.models import Appointment
from apps.scheduling.services.token_service import create_tokens_for_appointment

User = get_user_model()

logger = logging.getLogger(__name__)


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
        if self.action == "webhook":
            return [AllowAny()]
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

        qs = Payment.objects.select_related("practice", "patient", "appointment", "paid_by")

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

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def webhook(self, request: Request) -> Response:
        """
        MercadoPago webhook endpoint.

        AllowAny — MercadoPago sends POST requests without authentication.
        In production, validate the X-Signature header from MercadoPago
        before processing the payload.
        """
        data = request.data
        notification_type = data.get("type", "")

        if notification_type != "payment":
            logger.info("Billing webhook: ignored notification type=%s", notification_type)
            return Response({"detail": "Notification type ignored."}, status=status.HTTP_200_OK)

        try:
            strategy = get_payment_strategy(Payment.MERCADOPAGO)
            payment = strategy.process_webhook(data)
            logger.info("Billing webhook: Payment #%s updated to %s", payment.pk, payment.status)
            return Response({"detail": "OK"}, status=status.HTTP_200_OK)
        except Payment.DoesNotExist:
            logger.warning("Billing webhook: payment not found for data=%s", data)
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            logger.error("Billing webhook: unexpected error: %s", exc, exc_info=True)
            return Response(
                {"detail": "Internal error processing webhook."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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

        if not MercadoPagoStrategy.validate_webhook_signature(
            headers=request.META,
            data_id=data_id,
            request_id=request_id,
            secret=webhook_secret,
        ):
            logger.warning("MercadoPago webhook: invalid signature, rejecting request")
            return Response({"detail": "Invalid signature."}, status=status.HTTP_403_FORBIDDEN)

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

            # Create tokens before sending confirmation so the email can include action links.
            token_urls = None
            try:
                if appointment:
                    create_tokens_for_appointment(appointment)
                    logger.info(
                        "MercadoPago webhook: tokens created for Appointment #%s",
                        appointment.pk,
                    )
                    # Build token_urls dict to pass into the confirmation email
                    from apps.scheduling.models import AppointmentToken

                    site_url = getattr(settings, "SITE_URL", "").rstrip("/")
                    tokens = AppointmentToken.objects.filter(
                        appointment=appointment,
                        used_at__isnull=True,
                    ).values("action", "token")
                    token_map = {t["action"]: t["token"] for t in tokens}
                    if token_map:
                        token_urls = {
                            "confirm": f"{site_url}/a/{token_map.get('CONFIRM', '')}/",
                            "cancel": f"{site_url}/a/{token_map.get('CANCEL', '')}/",
                            "reschedule": f"{site_url}/a/{token_map.get('RESCHEDULE', '')}/",
                        }
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
