from rest_framework import permissions


class IsLecturer(permissions.BasePermission):
    """Allow access only to lecturer/admin role users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "lecturer")


class IsOwnerOrShared(permissions.BasePermission):
    """Allow owner access or shared visibility for read operations."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            if hasattr(obj, "visibility") and obj.visibility == obj.VISIBILITY_SHARED:
                return True
        return obj.owner_id == getattr(request.user, "id", None)
