from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from .models import CustomUser


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register new admin user
    POST /api/accounts/register/
    """
    print("=== REGISTER REQUEST ===")
    print("Request data:", request.data)
    
    serializer = RegisterSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        print(f"User created: {user.username}, Email: {user.email}")
        
        # Create or get token for the user
        token, created = Token.objects.get_or_create(user=user)
        
        # Serialize user data
        user_data = UserSerializer(user).data
        
        return Response({
            'success': True,
            'message': 'Registrasi berhasil',
            'token': token.key,
            'user': user_data
        }, status=status.HTTP_201_CREATED)
    
    print("Serializer errors:", serializer.errors)
    return Response({
        'success': False,
        'message': 'Registrasi gagal',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login admin user
    POST /api/accounts/login/
    """
    print("=== LOGIN REQUEST ===")
    print("Request data:", request.data)
    
    serializer = LoginSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Login user (create session)
        login(request, user)
        
        # Create or get token
        token, created = Token.objects.get_or_create(user=user)
        
        # Serialize user data
        user_data = UserSerializer(user).data
        
        return Response({
            'success': True,
            'message': 'Login berhasil',
            'token': token.key,
            'user': user_data
        }, status=status.HTTP_200_OK)
    
    print("Serializer errors:", serializer.errors)
    return Response({
        'success': False,
        'message': 'Login gagal',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout admin user
    POST /api/accounts/logout/
    """
    try:
        # Delete user's token
        request.user.auth_token.delete()
        
        # Logout from session
        logout(request)
        
        return Response({
            'success': True,
            'message': 'Logout berhasil'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Get current user profile
    GET /api/accounts/profile/
    """
    user_data = UserSerializer(request.user).data
    
    return Response({
        'success': True,
        'user': user_data
    }, status=status.HTTP_200_OK)
