import base64
import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from weasyprint import HTML

from apps.users.models import User
from apps.users.serializers import UserProfileUpdateSerializer, UserRegistrationSerializer, UserSerializer

AVATAR_MAX_SIZE = 5 * 1024 * 1024  # 5 MB
AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@method_decorator(ratelimit(key="ip", rate="15/h", method="POST", block=True), name="post")
class UserRegistrationView(generics.CreateAPIView):
    """
    POST /api/v1/register/

    Registers a new user with TUTOR role. No authentication required.
    Rate limited to 15 registrations per hour per IP.
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
        base_url = settings.FRONTEND_URL
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

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": list(exc.messages)},
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

        user = request.user
        if not user.check_password(current_password):
            return Response(
                {"detail": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": list(exc.messages)},
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


class ProfileExportPDFView(APIView):
    """
    GET /api/v1/profile/export-pdf/

    Practice summary PDF for the doctor. Includes practice data, locations,
    services with pricing, working hours, and key statistics.
    Returns the file as an attachment.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> HttpResponse:
        from collections import defaultdict

        from apps.patients.models import Patient
        from apps.practice.models import Location, Practice, Service, WorkingHours
        from apps.scheduling.models import Appointment

        user = request.user
        practice = Practice.objects.filter(owner=user).first()
        if not practice:
            practice = Practice.objects.filter(is_active=True).first()
        if not practice:
            return HttpResponse("No practice found", status=404)

        locations = Location.objects.filter(practice=practice, is_active=True).order_by("name")
        services = Service.objects.filter(practice=practice, is_active=True).order_by("display_order", "name")
        working_hours = WorkingHours.objects.filter(
            practice=practice, is_active=True
        ).select_related("location").order_by("location__name", "day_of_week")

        # Stats
        total_patients = Patient.objects.filter(practice=practice, is_active=True).count()
        today = timezone.now().date()
        first_of_month = today.replace(day=1)
        appointments_this_month = Appointment.objects.filter(
            practice=practice,
            scheduled_date__gte=first_of_month,
            scheduled_date__lte=today,
            status__in=["CONFIRMED", "COMPLETED", "CHECKED_IN", "IN_PROGRESS"],
        ).count()
        completed_total = Appointment.objects.filter(
            practice=practice, status="COMPLETED"
        ).count()

        # Embed the logo as base64 so WeasyPrint can render it without filesystem access
        logo_path = Path(__file__).resolve().parents[3] / "frontend" / "public" / "images" / "logofinal.png"
        logo_b64 = ""
        if logo_path.exists():
            logo_b64 = base64.b64encode(logo_path.read_bytes()).decode()

        # Group working hours by location name
        DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        hours_by_location: dict = defaultdict(list)
        for wh in working_hours:
            loc_name = wh.location.name if wh.location else "Online"
            hours_by_location[loc_name].append({
                "day": DAY_NAMES[wh.day_of_week],
                "start": wh.start_time.strftime("%H:%M"),
                "end": wh.end_time.strftime("%H:%M"),
            })

        # Pre-format prices for Chilean display ($XX.XXX)
        services_list = []
        for svc in services:
            services_list.append({
                "name": svc.name,
                "duration_minutes": svc.duration_minutes,
                "modality": svc.modality,
                "price_display": f"${svc.price_clp:,.0f}".replace(",", ".") if svc.price_clp else None,
            })

        context = {
            "user": user,
            "practice": practice,
            "locations": locations,
            "services": services_list,
            "hours_by_location": dict(hours_by_location),
            "total_patients": total_patients,
            "appointments_this_month": appointments_this_month,
            "completed_total": completed_total,
            "logo_b64": logo_b64,
            "generated_at": timezone.now(),
            "month_name": today.strftime("%B %Y"),
        }

        html_string = render_to_string("pdf/practice_summary.html", context, request=request)
        pdf_file = HTML(string=html_string, base_url=request.build_absolute_uri("/")).write_pdf()

        filename = f"consultorio-{timezone.now().strftime('%Y-%m-%d')}.pdf"
        response = HttpResponse(pdf_file, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class AvatarUploadView(APIView):
    """
    POST   /api/v1/profile/avatar/ — upload avatar (multipart/form-data, field: "avatar")
    DELETE /api/v1/profile/avatar/ — remove avatar
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request: Request) -> Response:
        file = request.FILES.get("avatar")
        if not file:
            return Response(
                {"detail": "No se envió ninguna imagen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.content_type not in AVATAR_ALLOWED_TYPES:
            return Response(
                {"detail": "Formato no permitido. Usá JPEG, PNG o WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > AVATAR_MAX_SIZE:
            return Response(
                {"detail": "La imagen no puede superar los 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if user.avatar:
            old_path = user.avatar.path
            if os.path.isfile(old_path):
                os.remove(old_path)

        user.avatar = file
        user.save(update_fields=["avatar"])

        serializer = UserSerializer(user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request: Request) -> Response:
        user = request.user
        if user.avatar:
            old_path = user.avatar.path
            if os.path.isfile(old_path):
                os.remove(old_path)
            user.avatar = ""
            user.save(update_fields=["avatar"])

        return Response(status=status.HTTP_204_NO_CONTENT)
