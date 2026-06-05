from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.serializers import UserProfileUpdateSerializer, UserRegistrationSerializer, UserSerializer


class UserRegistrationView(generics.CreateAPIView):
    """
    POST /api/v1/register/

    Registers a new user with TUTOR role. No authentication required.
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/v1/profile/  — retrieve own profile
    PATCH /api/v1/profile/ — update own profile (first_name, last_name, phone)

    Requires authentication.
    """

    permission_classes = [IsAuthenticated]

    def get_object(self) -> User:
        return self.request.user  # type: ignore[return-value]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserProfileUpdateSerializer
        return UserSerializer

    def update(self, request: Request, *args, **kwargs) -> Response:
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)


class PasswordResetRequestView(APIView):
    """
    POST /api/v1/password-reset/

    Accepts an email address and sends a password reset link if the user exists.
    Always returns 200 to avoid leaking whether an email is registered.
    Rate-limited to 1 email per 2 minutes per address via cache.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        from apps.notifications.services.email_service import send_password_reset_email

        email = request.data.get("email", "").strip().lower()
        generic_response = Response(
            {"detail": "Si el email existe, recibirás un link de recuperación."},
            status=status.HTTP_200_OK,
        )

        if not email:
            return generic_response

        # Rate limit: 1 email per 2 minutes per address
        cache_key = f"pwd_reset_rate:{email}"
        if cache.get(cache_key):
            return generic_response
        cache.set(cache_key, True, timeout=120)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return generic_response

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        base_url = "https://estefipediatra.com"
        reset_url = f"{base_url}/reset-password/{uid}/{token}"

        try:
            send_password_reset_email(user, reset_url)
        except Exception:
            # Never expose internal errors to the client
            pass

        return generic_response


class PasswordResetConfirmView(APIView):
    """
    POST /api/v1/password-reset/confirm/

    Validates uid + token and sets the new password.
    Returns 400 if the token is invalid or expired.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        from apps.notifications.services.email_service import send_password_changed_email

        uid_b64 = request.data.get("uid", "")
        token = request.data.get("token", "")
        new_password = request.data.get("new_password", "")

        invalid_response = Response(
            {"detail": "El link de recuperación es inválido o expiró."},
            status=status.HTTP_400_BAD_REQUEST,
        )

        if not uid_b64 or not token or not new_password:
            return invalid_response

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError):
            return invalid_response

        if not default_token_generator.check_token(user, token):
            return invalid_response

        user.set_password(new_password)
        user.save(update_fields=["password"])

        try:
            send_password_changed_email(user)
        except Exception:
            pass

        return Response(
            {"detail": "Contraseña actualizada correctamente."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    POST /api/v1/change-password/

    Authenticated endpoint to change password from the profile page.
    Requires current_password, new_password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        from apps.notifications.services.email_service import send_password_changed_email

        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not current_password or not new_password:
            return Response(
                {"detail": "Todos los campos son obligatorios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"detail": "La nueva contraseña debe tener al menos 8 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if not user.check_password(current_password):
            return Response(
                {"detail": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        try:
            send_password_changed_email(user)
        except Exception:
            pass

        return Response(
            {"detail": "Contraseña actualizada correctamente."},
            status=status.HTTP_200_OK,
        )
