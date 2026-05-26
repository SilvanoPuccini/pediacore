"""
Views for the PEDIACORE billing app.

Endpoints:
  - PaymentViewSet: CRUD for payments + MercadoPago preference + webhook + XLSX export
  - InvoiceViewSet: list/detail for invoices + PDF download
  - PaymentProviderViewSet: admin CRUD for payment provider configs
"""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

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
from apps.billing.services.invoice_service import generate_invoice_pdf
from apps.billing.services.payment_strategy import get_payment_strategy
from apps.core.pagination import StandardPagination
from apps.core.permissions import IsDoctor

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

        qs = Payment.objects.select_related(
            "practice", "patient", "appointment", "paid_by"
        )

        if user.role == User.TUTOR:
            from apps.patients.models import TutorPatient

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list(
                "patient_id", flat=True
            )
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

            patient_ids = TutorPatient.objects.filter(tutor=user).values_list(
                "patient_id", flat=True
            )
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
        response["Content-Disposition"] = (
            f'attachment; filename="{invoice.invoice_number}.pdf"'
        )
        return response


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
