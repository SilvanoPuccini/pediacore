import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for creating User instances in tests."""

    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    phone = factory.Faker("phone_number")
    role = User.TUTOR
    is_active = True
    is_staff = False
    password = factory.PostGenerationMethodCall("set_password", "testpass123")


class DoctorFactory(UserFactory):
    """Factory for DOCTOR role users."""

    role = User.DOCTOR
    is_staff = True


class VisitorFactory(UserFactory):
    """Factory for VISITOR role users."""

    role = User.VISITOR
