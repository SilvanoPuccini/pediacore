from django.urls import path

from apps.users.views import UserProfileView, UserRegistrationView

app_name = "users"

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="register"),
    path("profile/", UserProfileView.as_view(), name="profile"),
]
