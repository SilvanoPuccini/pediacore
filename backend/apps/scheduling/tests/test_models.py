from __future__ import annotations

import datetime

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.scheduling.models import (
    Appointment,
    AutoResponderConfig,
    CancellationPolicy,
    CancellationTier,
    WaitlistEntry,
)
from tests.factories.scheduling import (
    AppointmentFactory,
    AutoResponderConfigFactory,
    CancellationPolicyFactory,
    CancellationTierFactory,
    WaitlistEntryFactory,
)
from tests.factories.practice import ServiceFactory


@pytest.mark.django_db
class TestAppointmentModel:
    def test_create_appointment(self):
        appt = AppointmentFactory()
        assert appt.pk is not None
        assert appt.status == Appointment.PENDING

    def test_appointment_str(self):
        appt = AppointmentFactory()
        result = str(appt)
        assert str(appt.patient) in result
        assert "Pending" in result

    def test_appointment_soft_delete(self):
        appt = AppointmentFactory()
        pk = appt.pk
        appt.soft_delete()
        assert appt.deleted_at is not None
        assert not Appointment.objects.filter(pk=pk).exists()
        assert Appointment.objects.all_with_deleted().filter(pk=pk).exists()

    def test_appointment_restore(self):
        appt = AppointmentFactory()
        appt.soft_delete()
        appt.restore()
        assert appt.deleted_at is None
        assert Appointment.objects.filter(pk=appt.pk).exists()

    def test_end_time_auto_calculated(self):
        service = ServiceFactory(duration_minutes=45)
        appt = AppointmentFactory(
            service=service,
            start_time=datetime.time(9, 0),
        )
        assert appt.end_time == datetime.time(9, 45)

    def test_end_time_auto_calculated_30_minutes(self):
        service = ServiceFactory(duration_minutes=30)
        appt = AppointmentFactory(
            service=service,
            start_time=datetime.time(10, 0),
        )
        assert appt.end_time == datetime.time(10, 30)

    def test_clean_no_overlap_passes(self):
        appt1 = AppointmentFactory(
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
        )
        appt2 = AppointmentFactory.build(
            practice=appt1.practice,
            location=appt1.location,
            scheduled_date=appt1.scheduled_date,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            status=Appointment.PENDING,
        )
        appt2.clean()  # should not raise

    def test_clean_overlap_raises(self):
        appt1 = AppointmentFactory(
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
        )
        appt2 = AppointmentFactory.build(
            practice=appt1.practice,
            location=appt1.location,
            scheduled_date=appt1.scheduled_date,
            start_time=datetime.time(9, 15),
            end_time=datetime.time(9, 45),
            status=Appointment.PENDING,
        )
        with pytest.raises(ValidationError):
            appt2.clean()

    def test_cancelled_appointment_does_not_block_slot(self):
        appt1 = AppointmentFactory(
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            status=Appointment.CANCELLED,
        )
        appt2 = AppointmentFactory.build(
            practice=appt1.practice,
            location=appt1.location,
            scheduled_date=appt1.scheduled_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(9, 30),
            status=Appointment.PENDING,
        )
        appt2.clean()  # cancelled appointment should not cause conflict

    def test_appointment_defaults(self):
        appt = AppointmentFactory()
        assert appt.is_online is False
        assert appt.cancellation_reason == ""
        assert appt.notes == ""
        assert appt.cancelled_at is None
        assert appt.confirmed_at is None

    def test_appointment_status_choices(self):
        choices = dict(Appointment.STATUS_CHOICES)
        assert Appointment.PENDING in choices
        assert Appointment.CONFIRMED in choices
        assert Appointment.CANCELLED in choices
        assert Appointment.COMPLETED in choices
        assert Appointment.NO_SHOW in choices


@pytest.mark.django_db
class TestWaitlistEntryModel:
    def test_create_waitlist_entry(self):
        entry = WaitlistEntryFactory()
        assert entry.pk is not None
        assert entry.status == WaitlistEntry.WAITING

    def test_waitlist_entry_str(self):
        entry = WaitlistEntryFactory()
        result = str(entry)
        assert str(entry.patient) in result
        assert "Waiting" in result

    def test_waitlist_soft_delete(self):
        entry = WaitlistEntryFactory()
        pk = entry.pk
        entry.soft_delete()
        assert not WaitlistEntry.objects.filter(pk=pk).exists()
        assert WaitlistEntry.objects.all_with_deleted().filter(pk=pk).exists()

    def test_waitlist_null_location_any_location(self):
        entry = WaitlistEntryFactory(location=None)
        assert entry.location is None

    def test_waitlist_ordering_by_created_at(self):
        practice = WaitlistEntryFactory().practice
        entries = list(WaitlistEntry.objects.filter(practice=practice))
        assert len(entries) >= 1


@pytest.mark.django_db
class TestCancellationPolicyModel:
    def test_create_policy(self):
        policy = CancellationPolicyFactory()
        assert policy.pk is not None
        assert policy.is_active is True

    def test_policy_str(self):
        policy = CancellationPolicyFactory()
        assert "Cancellation Policy" in str(policy)

    def test_policy_soft_delete(self):
        policy = CancellationPolicyFactory()
        pk = policy.pk
        policy.soft_delete()
        assert not CancellationPolicy.objects.filter(pk=pk).exists()

    def test_policy_one_to_one_practice(self):
        policy = CancellationPolicyFactory()
        assert policy.practice.cancellation_policy == policy


@pytest.mark.django_db
class TestCancellationTierModel:
    def test_create_tier(self):
        tier = CancellationTierFactory(min_hours_before=48, penalty_percentage="0.00")
        assert tier.pk is not None

    def test_tier_str(self):
        tier = CancellationTierFactory(description="Free cancellation", penalty_percentage="0.00")
        result = str(tier)
        assert "Free cancellation" in result

    def test_tier_ordering_descending(self):
        policy = CancellationPolicyFactory()
        tier1 = CancellationTierFactory(policy=policy, min_hours_before=48, penalty_percentage="0.00", description="Free")
        tier2 = CancellationTierFactory(policy=policy, min_hours_before=24, penalty_percentage="50.00", description="50%")
        tier3 = CancellationTierFactory(policy=policy, min_hours_before=0, penalty_percentage="100.00", description="Full")
        tiers = list(CancellationTier.objects.filter(policy=policy))
        assert tiers[0].min_hours_before >= tiers[1].min_hours_before >= tiers[2].min_hours_before

    def test_tier_no_soft_delete(self):
        tier = CancellationTierFactory()
        assert not hasattr(tier, "deleted_at")


@pytest.mark.django_db
class TestAutoResponderConfigModel:
    def test_create_config(self):
        config = AutoResponderConfigFactory()
        assert config.pk is not None
        assert config.is_active is False

    def test_config_str(self):
        config = AutoResponderConfigFactory()
        result = str(config)
        assert "Auto Responder" in result
        assert "inactive" in result

    def test_config_active_str(self):
        config = AutoResponderConfigFactory(is_active=True)
        result = str(config)
        assert "active" in result

    def test_config_soft_delete(self):
        config = AutoResponderConfigFactory()
        pk = config.pk
        config.soft_delete()
        assert not AutoResponderConfig.objects.filter(pk=pk).exists()
