from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):
    """Read serializer for the User model. Exposes safe, non-sensitive fields."""

    full_name = serializers.CharField(read_only=True)
    is_email_verified = serializers.BooleanField(read_only=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "phone_prefix",
            "phone_alt",
            "document_type",
            "rut",
            "role",
            "full_name",
            "is_email_verified",
            "created_at",
            "profile_completion",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "created_at", "profile_completion"]

    def get_profile_completion(self, obj: User) -> dict:
        from apps.users.services.profile_completion import compute_tutor_completion

        return compute_tutor_completion(obj)


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for new user registration. Creates a TUTOR by default."""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone",
            "phone_prefix",
            "document_type",
            "rut",
        ]

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data: dict) -> User:
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(role=User.TUTOR, **validated_data)
        user.set_password(password)
        user.save()
        self._send_welcome_email(user)
        return user

    @staticmethod
    def _send_welcome_email(user: User) -> None:
        """Send a branded welcome email to the newly registered user."""
        try:
            from apps.notifications.services.email_service import (
                _build_appointment_html,
                send_email,
            )

            features_html = (
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"'
                ' style="margin:8px 0 20px;">'
                # Feature 1: Reserva online
                "<tr>"
                '<td style="padding:16px; background-color:#F7F0E5; border-radius:10px;">'
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
                '<td style="vertical-align:top; padding-right:12px; width:36px;">'
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A8590"'
                ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>'
                '<line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>'
                '<line x1="3" y1="10" x2="21" y2="10"/></svg></td>'
                "<td style=\"font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px;"
                ' color:#2C2C2C; line-height:1.5;">'
                "<strong>Reserva online</strong><br>"
                '<span style="color:#666666; font-size:13px;">Agend&aacute; turnos presenciales'
                " en Puc&oacute;n o Villarrica, o consultas online.</span>"
                "</td></tr></table></td></tr>"
                '<tr><td style="padding:5px 0;"></td></tr>'
                # Feature 2: Historial
                "<tr>"
                '<td style="padding:16px; background-color:#F7F0E5; border-radius:10px;">'
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
                '<td style="vertical-align:top; padding-right:12px; width:36px;">'
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A8590"'
                ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
                '<polyline points="14 2 14 8 20 8"/>'
                '<line x1="16" y1="13" x2="8" y2="13"/>'
                '<line x1="16" y1="17" x2="8" y2="17"/></svg></td>'
                "<td style=\"font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px;"
                ' color:#2C2C2C; line-height:1.5;">'
                "<strong>Historial de citas</strong><br>"
                '<span style="color:#666666; font-size:13px;">Gestion&aacute; tus turnos,'
                " descarg&aacute; comprobantes y reprogramá desde tu portal.</span>"
                "</td></tr></table></td></tr>"
                '<tr><td style="padding:5px 0;"></td></tr>'
                # Feature 3: Recordatorios
                "<tr>"
                '<td style="padding:16px; background-color:#F7F0E5; border-radius:10px;">'
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
                '<td style="vertical-align:top; padding-right:12px; width:36px;">'
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A8590"'
                ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>'
                '<path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></td>'
                "<td style=\"font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:14px;"
                ' color:#2C2C2C; line-height:1.5;">'
                "<strong>Recordatorios</strong><br>"
                '<span style="color:#666666; font-size:13px;">Recibí avisos autom&aacute;ticos'
                " antes de cada consulta para no olvidarte.</span>"
                "</td></tr></table></td></tr>"
                "</table>"
                # CTA button
                '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
                '<td style="background-color:#4A8590; border-radius:8px; text-align:center;'
                ' padding:14px 24px;">'
                '<a href="https://estefipediatra.com/booking" style="color:#FFFFFF;'
                " font-family:'Plus Jakarta Sans',Arial,sans-serif; font-size:15px;"
                ' font-weight:600; text-decoration:none; display:inline-block;">'
                "Agendar mi primera consulta</a>"
                "</td></tr></table>"
            )

            html_body = _build_appointment_html(
                title="&iexcl;Bienvenida/o!",
                body_lines=[
                    f"Hola {user.first_name},",
                    "Tu cuenta fue creada correctamente. Ya pod&eacute;s acceder a todos "
                    "los servicios de la Dra. Estefi desde la comodidad de tu hogar.",
                ],
                extra_html=features_html,
            )
            send_email(
                to=user.email,
                subject="¡Bienvenida/o a Dra. Estefi Pediatra!",
                html_body=html_body,
            )
        except Exception:
            pass  # Don't block registration if email fails


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Partial update serializer for user profile."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "phone", "phone_prefix", "phone_alt", "document_type", "rut"]

    def update(self, instance: User, validated_data: dict) -> User:
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.phone = validated_data.get("phone", instance.phone)
        instance.phone_prefix = validated_data.get("phone_prefix", instance.phone_prefix)
        instance.phone_alt = validated_data.get("phone_alt", instance.phone_alt)
        instance.document_type = validated_data.get("document_type", instance.document_type)
        instance.rut = validated_data.get("rut", instance.rut)
        instance.save()
        return instance
