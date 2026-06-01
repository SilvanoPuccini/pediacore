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
        """Send a welcome email to the newly registered user."""
        try:
            from apps.notifications.services.email_service import send_email

            html_body = f"""
            <html>
            <body style="font-family: sans-serif; color: #333;">
                <h2>¡Bienvenida/o a Dra. Estefi Pediatra!</h2>
                <p>Hola {user.first_name},</p>
                <p>Tu cuenta fue creada correctamente. Ya podés reservar turnos
                pediátricos en Pucón y Villarrica, o consultas online.</p>
                <p>Ingresá a <a href="https://estefipediatra.com/booking">estefipediatra.com/booking</a>
                para agendar tu primera consulta.</p>
                <hr>
                <p style="font-size: 12px; color: #888;">
                    Consultorio Pediátrico — Dra. Estefanía
                </p>
            </body>
            </html>
            """
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
        fields = ["first_name", "last_name", "phone", "phone_prefix", "rut"]

    def update(self, instance: User, validated_data: dict) -> User:
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.phone = validated_data.get("phone", instance.phone)
        instance.phone_prefix = validated_data.get("phone_prefix", instance.phone_prefix)
        instance.rut = validated_data.get("rut", instance.rut)
        instance.save()
        return instance
