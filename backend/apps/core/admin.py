from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.core.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    """
    Read-only admin view for the audit log.

    Logs are created programmatically and must never be modified or deleted
    via the admin interface.
    """

    list_display = ("user", "action", "resource_type", "resource_id", "timestamp")
    list_filter = ("action", "resource_type")
    search_fields = ("user__email", "resource_type", "resource_id")
    list_select_related = ["user"]
    readonly_fields = (
        "user",
        "action",
        "resource_type",
        "resource_id",
        "ip_address",
        "user_agent",
        "metadata",
        "timestamp",
    )
    date_hierarchy = "timestamp"

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
