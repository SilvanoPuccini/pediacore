from django.urls import path

from apps.users.views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserProfileView,
    UserRegistrationView,
)

app_name = "users"

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
