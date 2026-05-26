from __future__ import annotations

import factory
from django.utils import timezone

from apps.billing.models import Invoice, Payment, PaymentProvider
from tests.factories.patients import PatientFactory
from tests.factories.practice import PracticeFactory
from tests.factories.scheduling import AppointmentFactory
from tests.factories.users import UserFactory


class PaymentFactory(factory.django.DjangoModelFactory):
    """Factory for creating Payment instances in tests."""

    class Meta:
        model = Payment

    practice = factory.SubFactory(PracticeFactory)
    appointment = factory.SubFactory(
        AppointmentFactory,
        practice=factory.SelfAttribute("..practice"),
        patient=factory.SelfAttribute("..patient"),
    )
    patient = factory.SubFactory(PatientFactory, practice=factory.SelfAttribute("..practice"))
    paid_by = factory.SubFactory(UserFactory)
    amount = factory.Sequence(lambda n: f"{(n + 1) * 25000}.00")
    currency = "CLP"
    status = Payment.PENDING
    payment_method = Payment.CASH
    external_id = ""
    external_status = ""
    metadata = factory.LazyFunction(dict)
    paid_at = None
    notes = ""


class CompletedPaymentFactory(PaymentFactory):
    """Factory for completed payments."""

    status = Payment.COMPLETED
    paid_at = factory.LazyFunction(timezone.now)
    external_status = "approved"


class InvoiceFactory(factory.django.DjangoModelFactory):
    """Factory for creating Invoice instances in tests."""

    class Meta:
        model = Invoice

    practice = factory.SubFactory(PracticeFactory)
    payment = factory.SubFactory(
        CompletedPaymentFactory,
        practice=factory.SelfAttribute("..practice"),
    )
    invoice_number = factory.Sequence(lambda n: f"PEDIA-2026-{n + 1:06d}")
    patient_name = factory.LazyAttribute(
        lambda obj: f"{obj.payment.patient.first_name} {obj.payment.patient.last_name}"
    )
    patient_rut = ""
    service_description = "Consulta pediátrica"
    subtotal = factory.LazyAttribute(lambda obj: obj.payment.amount)
    tax_amount = "0.00"
    total = factory.LazyAttribute(lambda obj: obj.payment.amount)


class PaymentProviderFactory(factory.django.DjangoModelFactory):
    """Factory for creating PaymentProvider instances in tests."""

    class Meta:
        model = PaymentProvider
        django_get_or_create = ("practice", "provider_type")

    practice = factory.SubFactory(PracticeFactory)
    provider_type = PaymentProvider.MERCADOPAGO
    is_active = True
    config = factory.LazyFunction(lambda: {"access_token": "TEST-stub-token"})
