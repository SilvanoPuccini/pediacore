import factory

from apps.core.models import AuditLog
from tests.factories.users import UserFactory


class AuditLogFactory(factory.django.DjangoModelFactory):
    """Factory for creating AuditLog instances in tests."""

    class Meta:
        model = AuditLog

    user = factory.SubFactory(UserFactory)
    action = AuditLog.VIEW
    resource_type = "Patient"
    resource_id = factory.Sequence(lambda n: n + 1)
    ip_address = "127.0.0.1"
    user_agent = factory.Faker("user_agent")
    metadata = factory.LazyFunction(dict)
