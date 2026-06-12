from django.urls import path

from apps.users.views import (
    AvatarUploadView,
    ChangePasswordView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileExportPDFView,
    UserProfileView,
    UserRegistrationView,
)

app_name = "users"

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("profile/avatar/", AvatarUploadView.as_view(), name="profile-avatar"),
    path("profile/export-pdf/", ProfileExportPDFView.as_view(), name="profile-export-pdf"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
