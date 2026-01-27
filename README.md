# SmartClassroom (Branch: dashboard)

This repository is intended to be run from the **dashboard** branch. The `main` branch is not stable.

## Prerequisites

- Git
- Python 3.10+ (with pip)
- Node.js 18+ (with npm)

## Quick start (recommended)

### 1) Clone the dashboard branch directly

```bash
# option A: clone only dashboard (recommended)
git clone -b dashboard --single-branch https://github.com/muFahm/smartclassroom.git

# option B: already cloned, then switch
# git fetch origin
# git checkout dashboard
```

### 2) Run backend (Django)

```bash
cd smartclassroom/backend

# create venv (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend will run at: http://127.0.0.1:8000

### 3) Run frontend (Node/React)

```bash
cd smartclassroom/frontend
npm install
npm start
```

Frontend will run at: http://localhost:3000

---

## One-step run (Windows PowerShell)

If you want a single command to start **both** backend and frontend, use the script below.

1) Create a file named `run-local.ps1` in the repo root and paste this content:

```powershell
# Run backend and frontend in separate terminals

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backend
Start-Process powershell "-NoExit" "-Command" "cd '$repoRoot\\smartclassroom\\backend'; if (!(Test-Path .venv)) { python -m venv .venv }; .\\.venv\\Scripts\\Activate.ps1; pip install -r requirements.txt; python manage.py migrate; python manage.py runserver"

# Frontend
Start-Process powershell "-NoExit" "-Command" "cd '$repoRoot\\smartclassroom\\frontend'; npm install; npm start"
```

2) Run it from PowerShell:

```powershell
./run-local.ps1
```

---

## Notes
- If PowerShell blocks script execution, run this once:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
- If you use VS Code, open the repo root and run the two servers in separate terminals.
