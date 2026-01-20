from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom User Model for Admin Prodi
    Only admin prodi can access the Smart Classroom dashboard
    """
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200, blank=True, null=True)
    position = models.CharField(max_length=100, default='admin', help_text='Position in Prodi')
    
    # Keep role for future expansion
    ROLE_CHOICES = (
        ('admin', 'Admin Prodi'),
        ('superadmin', 'Super Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='admin')

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return f"{self.username} - {self.full_name or self.email}"

    class Meta:
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'
