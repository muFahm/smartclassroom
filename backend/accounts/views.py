import json
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import CustomUser
from .serializers import RegisterSerializer

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse({"success": True, "message": "User registered successfully"})
        return JsonResponse({"success": False, "errors": serializer.errors}, status=400)

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return JsonResponse({
                "success": True,
                "email": user.email,
                "role": user.role,
                "username": user.username
            })
        return JsonResponse({"success": False, "error": "Invalid email or password"}, status=400)

@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({"success": True, "message": "Logged out successfully"})
