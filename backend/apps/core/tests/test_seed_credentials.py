import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

LEAKED_PASSWORD = "PediaCore2024!"
SEEDED_EMAILS = ("doctor@estefipediatra.com", "tutor@demo.com", "javier@demo.com")


@pytest.mark.django_db
class TestSeedDataCredentials:
    def test_seed_without_env_password_leaves_logins_unusable(self, monkeypatch):
        monkeypatch.delenv("SEED_USER_PASSWORD", raising=False)

        call_command("seed_data")

        for user in get_user_model().objects.filter(email__in=SEEDED_EMAILS):
            assert not user.has_usable_password()

    def test_seed_uses_env_password(self, monkeypatch):
        monkeypatch.setenv("SEED_USER_PASSWORD", "env-only-seed-secret-7")

        call_command("seed_data")

        doctor = get_user_model().objects.get(email="doctor@estefipediatra.com")
        assert doctor.check_password("env-only-seed-secret-7")
        assert not doctor.check_password(LEAKED_PASSWORD)


@pytest.mark.django_db
class TestLockLeakedSeedPasswords:
    def _user(self, email, password):
        user = get_user_model().objects.create_user(email=email, password=password)
        return user

    def test_locks_seeded_account_still_using_leaked_password(self):
        user = self._user("doctor@estefipediatra.com", LEAKED_PASSWORD)

        call_command("lock_leaked_seed_passwords")

        user.refresh_from_db()
        assert not user.has_usable_password()

    def test_keeps_seeded_account_whose_password_was_changed(self):
        user = self._user("doctor@estefipediatra.com", "a-private-password-81")

        call_command("lock_leaked_seed_passwords")

        user.refresh_from_db()
        assert user.check_password("a-private-password-81")

    def test_revokes_outstanding_refresh_tokens_of_locked_accounts(self):
        user = self._user("tutor@demo.com", LEAKED_PASSWORD)
        token = RefreshToken.for_user(user)

        call_command("lock_leaked_seed_passwords")

        assert BlacklistedToken.objects.filter(token__jti=token["jti"]).exists()

    def test_never_touches_other_accounts(self):
        user = self._user("someone@example.com", LEAKED_PASSWORD)

        call_command("lock_leaked_seed_passwords")

        user.refresh_from_db()
        assert user.check_password(LEAKED_PASSWORD)
