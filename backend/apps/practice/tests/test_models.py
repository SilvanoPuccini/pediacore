"""
Tests for practice app models.

Covers: Practice, Location, Service, WorkingHours, BlockedSlot.
"""

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.practice.models import WorkingHours
from tests.factories.practice import (
    BlockedSlotFactory,
    LocationFactory,
    PracticeFactory,
    ServiceFactory,
    WorkingHoursFactory,
)


@pytest.mark.django_db
class TestPracticeModel:
    def test_create_practice(self):
        practice = PracticeFactory()
        assert practice.pk is not None
        assert practice.name
        assert practice.is_active is True

    def test_practice_str(self):
        practice = PracticeFactory(name="Consultorio Estefanía")
        assert str(practice) == "Consultorio Estefanía"

    def test_practice_soft_delete(self):
        practice = PracticeFactory()
        pk = practice.pk
        practice.soft_delete()
        assert practice.deleted_at is not None
        # Soft-deleted record should NOT appear in default queryset
        from apps.practice.models import Practice
        assert not Practice.objects.filter(pk=pk).exists()
        assert Practice.objects.all_with_deleted().filter(pk=pk).exists()

    def test_practice_restore(self):
        practice = PracticeFactory()
        practice.soft_delete()
        practice.restore()
        assert practice.deleted_at is None
        from apps.practice.models import Practice
        assert Practice.objects.filter(pk=practice.pk).exists()


@pytest.mark.django_db
class TestLocationModel:
    def test_location_belongs_to_practice(self):
        practice = PracticeFactory()
        location = LocationFactory(practice=practice)
        assert location.practice == practice
        assert location in practice.locations.all()

    def test_location_str(self):
        location = LocationFactory(name="Pucón")
        assert "Pucón" in str(location)

    def test_location_soft_delete(self):
        location = LocationFactory()
        pk = location.pk
        location.soft_delete()
        from apps.practice.models import Location
        assert not Location.objects.filter(pk=pk).exists()
        assert Location.objects.all_with_deleted().filter(pk=pk).exists()


@pytest.mark.django_db
class TestServiceModel:
    def test_service_belongs_to_practice(self):
        practice = PracticeFactory()
        service = ServiceFactory(practice=practice)
        assert service.practice == practice

    def test_service_with_locations_m2m(self):
        practice = PracticeFactory()
        location1 = LocationFactory(practice=practice)
        location2 = LocationFactory(practice=practice)
        service = ServiceFactory(practice=practice)
        service.locations.set([location1, location2])
        assert service.locations.count() == 2
        assert location1 in service.locations.all()

    def test_service_str(self):
        service = ServiceFactory(name="Consulta General")
        assert "Consulta General" in str(service)

    def test_service_soft_delete(self):
        service = ServiceFactory()
        pk = service.pk
        service.soft_delete()
        from apps.practice.models import Service
        assert not Service.objects.filter(pk=pk).exists()
        assert Service.objects.all_with_deleted().filter(pk=pk).exists()


@pytest.mark.django_db
class TestWorkingHoursModel:
    def test_working_hours_creation(self):
        wh = WorkingHoursFactory()
        assert wh.pk is not None
        assert wh.day_of_week == WorkingHours.MONDAY

    def test_clean_valid_times(self):
        wh = WorkingHoursFactory.build(start_time="09:00", end_time="18:00")
        wh.clean()  # should not raise

    def test_clean_end_before_start_raises(self):
        wh = WorkingHoursFactory.build(start_time="18:00", end_time="09:00")
        with pytest.raises(ValidationError, match="End time must be after start time"):
            wh.clean()

    def test_clean_equal_times_raises(self):
        wh = WorkingHoursFactory.build(start_time="09:00", end_time="09:00")
        with pytest.raises(ValidationError):
            wh.clean()

    def test_day_of_week_choices(self):
        assert WorkingHours.MONDAY == 0
        assert WorkingHours.SUNDAY == 6

    def test_str_representation(self):
        wh = WorkingHoursFactory()
        result = str(wh)
        assert "Monday" in result or "09:00" in result


@pytest.mark.django_db
class TestBlockedSlotModel:
    def test_blocked_slot_creation(self):
        slot = BlockedSlotFactory()
        assert slot.pk is not None

    def test_clean_valid_datetimes(self):
        start = timezone.now()
        end = start + timezone.timedelta(hours=2)
        slot = BlockedSlotFactory.build(start_datetime=start, end_datetime=end)
        slot.clean()  # should not raise

    def test_clean_end_before_start_raises(self):
        start = timezone.now()
        end = start - timezone.timedelta(hours=1)
        slot = BlockedSlotFactory.build(start_datetime=start, end_datetime=end)
        with pytest.raises(ValidationError, match="End datetime must be after start datetime"):
            slot.clean()

    def test_clean_equal_datetimes_raises(self):
        now = timezone.now()
        slot = BlockedSlotFactory.build(start_datetime=now, end_datetime=now)
        with pytest.raises(ValidationError):
            slot.clean()

    def test_null_location_means_all_locations(self):
        slot = BlockedSlotFactory(location=None)
        assert slot.location is None

    def test_str_with_location(self):
        slot = BlockedSlotFactory()
        assert slot.location.name in str(slot)

    def test_str_without_location(self):
        slot = BlockedSlotFactory(location=None)
        assert "All locations" in str(slot)
