"""
Tests for Service model and ServiceSerializer (T-SVC-01 through T-SVC-05).
"""

from __future__ import annotations

import pytest
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.practice.models import Service
from apps.practice.serializers import ServiceSerializer
from tests.factories.practice import LocationFactory, PracticeFactory, ServiceFactory


@pytest.mark.django_db
class TestServiceModel:
    def test_svc_01_modality_presencial_serializes_correctly(self) -> None:
        """T-SVC-01: Service with modality=PRESENCIAL serializes correctly."""
        service = ServiceFactory(modality=Service.PRESENCIAL)
        data = ServiceSerializer(service).data

        assert data["modality"] == "PRESENCIAL"
        assert "is_online_available" not in data
        assert "price" not in data

    def test_svc_02_price_clp_is_integer_in_response(self) -> None:
        """T-SVC-02: Service with price_clp=40000 serializes as integer."""
        service = ServiceFactory(price_clp=40000)
        data = ServiceSerializer(service).data

        assert data["price_clp"] == 40000
        assert isinstance(data["price_clp"], int)
        assert "price" not in data

    def test_svc_03_service_ordering_by_display_order_then_name(self) -> None:
        """T-SVC-03: Services are ordered by display_order then name."""
        practice = PracticeFactory()
        s1 = ServiceFactory(practice=practice, name="Zeta", display_order=2)
        s2 = ServiceFactory(practice=practice, name="Alpha", display_order=1)
        s3 = ServiceFactory(practice=practice, name="Omega", display_order=1)

        services = list(Service.objects.filter(practice=practice))
        # s2 (order=1, Alpha) and s3 (order=1, Omega) come before s1 (order=2, Zeta)
        assert services.index(s2) < services.index(s1)
        assert services.index(s3) < services.index(s1)
        # Within same display_order, ordered by name: Alpha before Omega
        assert services.index(s2) < services.index(s3)

    def test_svc_04_factory_creates_service_with_valid_modality(self) -> None:
        """T-SVC-04: ServiceFactory creates service with valid modality."""
        service = ServiceFactory()
        assert service.pk is not None
        assert service.modality in dict(Service.MODALITY_CHOICES)

    def test_svc_05_negative_price_clp_rejected(self) -> None:
        """T-SVC-05: price_clp cannot be negative (PositiveIntegerField constraint)."""
        # PositiveIntegerField raises ValidationError for negative values
        service = ServiceFactory.build(price_clp=-1)
        with pytest.raises(Exception):
            # Django raises ValidationError on full_clean for negative PositiveIntegerField
            service.full_clean()

    def test_modality_choices_include_all_three(self) -> None:
        """All three modality values exist on the model."""
        choices = dict(Service.MODALITY_CHOICES)
        assert Service.PRESENCIAL in choices
        assert Service.ONLINE in choices
        assert Service.PRESENCIAL_Y_ONLINE in choices

    def test_is_online_property_presencial(self) -> None:
        """is_online property returns False for PRESENCIAL."""
        service = ServiceFactory(modality=Service.PRESENCIAL)
        assert service.is_online is False

    def test_is_online_property_online(self) -> None:
        """is_online property returns True for ONLINE."""
        service = ServiceFactory(modality=Service.ONLINE)
        assert service.is_online is True

    def test_is_online_property_both(self) -> None:
        """is_online property returns True for PRESENCIAL_Y_ONLINE."""
        service = ServiceFactory(modality=Service.PRESENCIAL_Y_ONLINE)
        assert service.is_online is True

    def test_modality_display_in_serializer(self) -> None:
        """modality_display field appears in ServiceSerializer response."""
        service = ServiceFactory(modality=Service.PRESENCIAL_Y_ONLINE)
        data = ServiceSerializer(service).data
        assert "modality_display" in data
        assert data["modality_display"] == "Presencial y online"

    def test_new_flags_default_false(self) -> None:
        """requires_fonasa_validation and requires_manual_coordination default to False."""
        service = ServiceFactory()
        assert service.requires_fonasa_validation is False
        assert service.requires_manual_coordination is False
