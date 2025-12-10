# SmartClassroom Frontend

Lecturer/admin dashboard for managing quiz content and running live sessions. Built with Create React App and React Router.

## Environment

- Node 18+
- `REACT_APP_API_BASE_URL` (defaults to `http://localhost:8000`)

Create a `.env` inside this folder if you want to point to a different backend:

```
REACT_APP_API_BASE_URL=http://localhost:8000
```

## Available Scripts

```bash
npm install          # install dependencies
npm start            # run dev server with hot reload
npm run build        # production build (outputs to build/)
npm test             # CRA test runner (optional for now)
```

Frontend expects JWT tokens coming from `/api/accounts/token/` and automatically refreshes them via `/api/accounts/token/refresh/`. Make sure the backend server is running locally on port 8000 (or update the env variable above).

### Lecturer Workflow

1. Login using a lecturer/admin account.
2. Access `/dashboard/quizzes` to create quiz packages and questions (including option/kunci editor).
3. Navigate into a package to see and manage all questions before launching a session.

Student- and device-facing flows will be added next; for now this SPA is focused purely on lecturer tooling.
