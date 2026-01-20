# Smart Classroom Backend - Setup Instructions

## 1. Install Dependencies

```bash
pip install djangorestframework
pip install django-cors-headers
```

## 2. Run Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## 3. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

## 4. Run Server

```bash
python manage.py runserver
```

Server will run at: http://localhost:8000

## API Endpoints

### Authentication

- **POST** `/api/accounts/register/` - Register new admin

  ```json
  {
    "username": "admin1",
    "email": "admin@fti.trisakti.ac.id",
    "password": "password123",
    "confirm_password": "password123",
    "full_name": "Admin FTI",
    "position": "admin"
  }
  ```

- **POST** `/api/accounts/login/` - Login admin

  ```json
  {
    "username": "admin1",
    "password": "password123"
  }
  ```

- **POST** `/api/accounts/logout/` - Logout (requires token)
  Headers: `Authorization: Token <your-token>`

- **GET** `/api/accounts/profile/` - Get user profile (requires token)
  Headers: `Authorization: Token <your-token>`

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "...",
  "token": "abc123...",
  "user": {
    "id": 1,
    "username": "admin1",
    "email": "admin@fti.trisakti.ac.id",
    "full_name": "Admin FTI",
    "position": "admin",
    "role": "admin"
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "...",
  "errors": {
    "field": ["error message"]
  }
}
```

## Testing with Postman/Thunder Client

1. Register: POST to http://localhost:8000/api/accounts/register/
2. Copy the token from response
3. Login: POST to http://localhost:8000/api/accounts/login/
4. Use token in Authorization header for protected routes
