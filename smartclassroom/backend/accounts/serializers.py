from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data response"""
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'full_name', 'position', 'role']
        read_only_fields = ['id']


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for admin registration"""
    password = serializers.CharField(
        write_only=True, 
        min_length=6,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'confirm_password', 'full_name', 'position']

    def validate(self, data):
        """Validate password match and email format"""
        if data.get('password') != data.get('confirm_password'):
            raise serializers.ValidationError({
                "confirm_password": "Password dan konfirmasi password tidak sama"
            })
        
        # Check if username already exists
        if CustomUser.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({
                "username": "Username sudah digunakan"
            })
        
        # Check if email already exists
        if CustomUser.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                "email": "Email sudah terdaftar"
            })
        
        return data

    def create(self, validated_data):
        """Create new admin user"""
        validated_data.pop('confirm_password')  # Remove confirm_password
        
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            position=validated_data.get('position', 'admin'),
            role='admin'
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for admin login"""
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, data):
        """Validate credentials"""
        username = data.get('username')
        password = data.get('password')

        if username and password:
            # Authenticate user
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )

            if not user:
                raise serializers.ValidationError({
                    "detail": "Username atau password salah"
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    "detail": "Akun tidak aktif"
                })

        else:
            raise serializers.ValidationError({
                "detail": "Username dan password harus diisi"
            })

        data['user'] = user
        return data
