# SmartClassroom Quiz & Polling Platform

## 1. Domain Model & ERD

The platform extends the existing `apps.accounts.CustomUser` with quiz-specific entities grouped into three bounded contexts: Content, Live Session, and Analytics/History. Below is the core entity relationship outline (PK underlined, FK in parentheses):

```
CustomUser
├─ id (PK)
├─ email (unique)
└─ role {student|lecturer}

QuizPackage
├─ id (PK)
├─ owner_id → CustomUser(id)
├─ title, description, topic
├─ visibility {private|shared}
└─ metadata (JSONField)

QuizQuestion
├─ id (PK)
├─ package_id → QuizPackage(id)
├─ body_text, body_rich, media_asset
├─ question_type {single|multiple|truefalse|numeric}
└─ difficulty_tag, order

QuizOption
├─ id (PK)
├─ question_id → QuizQuestion(id)
├─ label {A|B|C|D}
├─ body_text / asset
└─ is_correct (bool)

QuizSession
├─ id (PK)
├─ package_id → QuizPackage(id)
├─ host_id → CustomUser(id)
├─ code (short, unique, join token)
├─ status {draft|live|closed|archived}
├─ current_question_id → SessionQuestion(id, nullable)
└─ started_at, closed_at

SessionParticipant
├─ id (PK)
├─ session_id → QuizSession(id)
├─ user_id → CustomUser(id)
├─ device_id → PollingDevice(id, nullable)
└─ status {invited|connected|answering|disconnected}

PollingDevice
├─ id (PK, short code)
├─ hardware_uid (ESP32 MAC)
├─ assigned_to → CustomUser(id, nullable)
├─ firmware_version, battery, last_seen
└─ status {available|assigned|maintenance}

SessionQuestion
├─ id (PK)
├─ session_id → QuizSession(id)
├─ question_id → QuizQuestion(id)
├─ order
└─ open_at, close_at

DeviceResponse
├─ id (PK)
├─ session_question_id → SessionQuestion(id)
├─ participant_id → SessionParticipant(id)
├─ option_id → QuizOption(id)
├─ received_at
└─ source {device|web}

QuestionStat
├─ id (PK)
├─ session_question_id → SessionQuestion(id)
├─ correct_count, total_count
└─ distribution JSON {option_label: count}

ScoreSummary
├─ id (PK)
├─ session_id → QuizSession(id)
├─ participant_id → SessionParticipant(id)
├─ total_correct, total_questions
└─ percentage

StudentHistory
├─ id (PK)
├─ user_id → CustomUser(id)
├─ session_id → QuizSession(id)
├─ responses JSON (question_id → option_id)
└─ reviewed_at
```

Design considerations:
- **Normalization first, analytics later**: DeviceResponse captures atomic answers; aggregated `QuestionStat` and `ScoreSummary` are materialized views updated via signals/celery for fast reporting.
- **SessionQuestion decouples package questions from runtime** so admins can skip/reorder without mutating the source package.
- **PollingDevice** remains independent from participants, enabling pre-provisioning and ownership transfer flows.
- **StudentHistory** acts as denormalized cache powering student dashboards without rehydrating every DeviceResponse.

## 2. API Surface, Routing, and Authentication

### Authentication Strategy
- **Primary**: JWT (SimpleJWT) for SPA/device interaction. Access token short (5m), refresh 1d, rotate refresh + blacklist to revoke stolen tokens.
- **Secondary**: Session auth kept enabled for Django admin / staff web console. CSRF trusted origins limited to internal tools.
- **Device Credentials**: Polling devices authenticate via mutual pre-shared token per device + ROS agent. Each ESP32 stores a device token issued via backend, exchanged for short-lived MQTT/WebSocket session token.

### DRF Configuration
- `DEFAULT_AUTHENTICATION_CLASSES`: `JWTAuthentication`, `SessionAuthentication`.
- `DEFAULT_PERMISSION_CLASSES`: `IsAuthenticated` globally; open endpoints (login/register/public status) override with `AllowAny`.
- Custom permissions:
	- `IsLecturer` for admin-only endpoints (quiz creation, session control, analytics export).
	- `IsParticipantOfSession` to guard student-only APIs.
	- `OwnsDevice` for device assignment updates.
- Throttling: user + anon scopes, and `DeviceSubmissionThrottle` keyed by (device_id, session_question_id) to prevent flooding.

### Routing Conventions
```
api/
	accounts/ (registration/login/logout, profile)
	devices/
		assignments/
		heartbeat/
	quiz/
		packages/ (CRUD, import)
		questions/
		sessions/
			{sessionId}/participants/
			{sessionId}/control/open|close|next
			{sessionId}/responses/
		analytics/
			sessions/{sessionId}/summary
			packages/{packageId}/difficulty
	student/
		history/
		sessions/active
```

Routers:
- Use DRF `DefaultRouter` per bounded context module to keep namespaces small, then include under `api/quiz/...`.
- Example: `quiz_router.register("packages", PackageViewSet, basename="quiz-packages")` located in `apps.quiz.quizzes.api`.
- Action-specific endpoints (open/close polling, join session) implemented via `@action(detail=True, methods=["post"])` for atomicity.
- QA-only helpers: `POST /api/quiz/runtime/sessions/{id}/seed-participants/` auto-creates simulated student accounts + session participants, while `POST /api/quiz/runtime/sessions/{id}/simulate-responses/` injects answers with a controllable `correct_ratio`. Both expect lecturer JWT tokens and should be disabled in production builds.

### Realtime Channels & ROS Bridge
- Django Channels handles WebSocket topics `ws/quiz/sessions/{code}/` for admin dashboard & student web confirmation.
- Separate microservice (FastAPI or Node) may bridge to micro-ROS; define gRPC/REST contract (`/ros/publish`, `/ros/device-status`).
- All realtime endpoints require JWT access token; devices attach `Device-Token` header validated against PollingDevice table.
- **Simulator**: legacy CLI helper `simulate/ros_bridge.py` remains for single-participant smoke tests. A richer Tkinter GUI now lives in `simulate/student_response_gui.py`, letting lecturers seed N synthetic participants, pick accuracy %, and fire responses through the lecturer-only runtime helpers `/api/quiz/runtime/sessions/{id}/seed-participants/` and `/api/quiz/runtime/sessions/{id}/simulate-responses/` for QA drills.

## 3. Admin Feature: Quiz Management

### Backend
- **Package CRUD**: `PackageViewSet` with owner scoping (lecturers see their own + shared). Soft delete with `is_archived` to preserve history.
- **Question Builder**: Nested serializer or `ModelViewSet` for `QuizQuestion`; enforce max 1 correct option for single-choice. Use `select_related` to cut queries.
- **Media Handling**: Use `django-storages` + S3/minio. Accept uploads via presigned URL endpoint to offload large files.
- **Import**: Background task (Celery) that parses CSV/XLSX (using `tablib`) into temp table, validates, then bulk-creates within transaction. Surface row-level errors back to UI.
- **Versioning**: `QuizPackageVersion` table optionally tracks major edits; new session always references a frozen version object.
- **Validation Pipeline**: custom `clean()` on models ensuring at least two options, at least one correct, and unique labels per question.

### Frontend
- React route `/admin/quizzes` with three panes: package list, question grid, preview panel.
- Use React Query for data + optimistic updates; forms built with `react-hook-form` + zod validation mirroring backend constraints.
- Import wizard: drag-drop file, show parsed preview, highlight invalid rows, submit to `/api/quiz/packages/{id}/import`.
- Reusable **QuestionEditor** component supporting rich text, equation input (MathJax), image upload, option reorder (dnd-kit).
- **Implemented MVP shell**: `/dashboard/quizzes` now available for lecturers, offering JWT-based login, package creation/listing, and in-browser option editor for each question.
- **Upcoming (current iteration)**
	- Session console routes under `/dashboard/sessions`:
		- List view fetching `/api/quiz/runtime/sessions/` (filtered by host) with quick-create button tied to package.
		- Detail view showing participants (`/participants/`), device status, and controls hitting `start/open_question/close_question/reveal_answer/end` actions.
		- Live bar chart subscribes to `/api/quiz/runtime/questions/` poll (phase 1) and later WebSocket stream.
	- Analytics routes under `/dashboard/sessions/:id/report` consuming `/api/quiz/analytics/sessions/:id/`, `/questions/`, and `/scores/` to show summary metrics + export actions.
	- Simulator launcher entry that links to new `simulate/polling_sim.py` helper for QA runs.

### Security & DX
- Enforce `IsLecturer` + object-level permissions (only owner/co-owner can edit). Use Django Guardian or custom `PackageCollaborator` model.
- Audit trail via `django-simple-history` on Package + Question.
- Extensive unit tests: serializer validation, import parser, permission tests, and React component tests for form validation.

## 4. Admin Feature: Real-time Quiz Execution

### Backend Control Plane
- `QuizSessionViewSet` houses lifecycle actions: `start`, `open_question`, `close_question`, `reveal_answer`, `end`.
- `SessionStateMachine` service enforces valid transitions; emits domain events persisted in `SessionEvent` table for replay/debugging.
- Opening a question pushes message to
	- Redis pub/sub channel consumed by Django Channels group (web spectator UI).
	- ROS bridge endpoint translating to micro-ROS message for ESP32 (topic `/smartclassroom/session/{code}/question`).
- Closing a question flips `SessionQuestion.close_at`, stops accepting DeviceResponses (checked via DB constraint + service guard).

### Device & Participant Monitoring
- `DeviceHeartbeatView` updates PollingDevice.last_seen every 5 seconds (debounced). Admin panel subscribes to `device_status` channel for color-coded indicator.
- `SessionParticipant.status` automatically flips to `connected` when first heartbeat arrives within session scope.
- GraphQL subscription or REST SSE endpoint surfaces aggregated counts (connected vs disconnected) in admin UI.

### Frontend (Admin Console)
- Dedicated route `/admin/sessions/{sessionId}` showing: participant list, timeline, active question card, real-time bar chart (Recharts) fed by WebSocket.
- Controls (buttons) call respective POST actions; disable buttons when transition invalid.
- Chart data derived from `QuestionStat` updates pushed over socket every time DeviceResponse saved.
- “Reveal answer” overlay highlights correct option and triggers `DeviceFeedbackCommand` event (ROS) to blink LED colors.

### Reliability & Safety
- Idempotent endpoints: include `client_action_id` header stored in `SessionEvent` to prevent double-open.
- Concurrency: wrap open/close operations in `select_for_update` on `SessionQuestion` row + use Celery beat fallback to auto-close after timer.
- Observability: log every ROS publish + ack, store latency metrics for diagnosing network issues.

## 5. Admin Feature: Reporting & Analytics

### Data Pipeline
- DeviceResponse is write-heavy; nightly job (or streaming Celery chain) materializes:
	- `QuestionStat` (per session question distribution + correctness rate).
	- `ScoreSummary` (per participant totals).
	- `PackageInsight` (aggregate difficulty, discrimination index) for long-term analysis.
- Use Django ORM `bulk_update` for summaries, or move heavy lifting to PostgreSQL materialized views refreshed via SQL.
- Store exports in `ReportExport` table with status + download URL (S3) to avoid recomputing for repeated requests.

### APIs
- `GET /api/quiz/analytics/sessions/{id}/summary` → scoreboard, charts, attendance.
- `GET /api/quiz/analytics/questions/{id}` → historical correctness trend across sessions.
- `POST /api/quiz/analytics/sessions/{id}/export?format=excel|pdf` triggers Celery job; client polls `/exports/{jobId}`.
- **Implemented MVP:**
  - `GET /api/quiz/analytics/sessions/<id>/` returns metadata + live `QuestionStat` + `ScoreSummary` aggregates.
  - `GET /api/quiz/analytics/questions/?session_question__session=<sessionId>` for per-question distribution.
  - `GET /api/quiz/analytics/scores/?session=<sessionId>` for ordered scoreboard snapshots.

### Frontend UX
- Dashboard cards: average score, highest score, participation rate.
- Question table with conditional formatting (red if <40% correct). Clicking row opens modal showing distribution chart + list of students who missed it.
- Export drawer letting admin choose columns, anonymize names, and send email notification when ready.

### Security & Compliance
- All analytics endpoints require `IsLecturer` + `IsOwnerOrCollaborator` to prevent cross-class leakage.
- Exports expire after 7 days; signed URLs only accessible to requestor.
- For audit, store `report_filters` JSON + `requested_by` to trace data disclosures.

## 6. Student Feature: Preparation & Participation

### Device Assignment
- `POST /api/devices/assign` accepts `{device_code}` and verifies device exists, unassigned, and not flagged maintenance.
- Multi-factor confirmation: require password re-entry or OTP to avoid hijacking device IDs.
- Store assignment in `DeviceAssignment` history table with effective dates to audit usage.

### Device Status
- Student dashboard hits `GET /api/devices/me` returning connection status, battery, last_seen, firmware_version. Cache per user for 30s.
- Web UI signals status via badges (green connected, amber stale heartbeat >30s, red disconnected). Provide troubleshoot checklist.

### Join Session Flow
- Screen `/student/join` prompts for session code; call `POST /api/student/sessions/join`. Validations: session live, capacity, device assigned (if required).
- On success, backend creates/updates `SessionParticipant` and returns WebSocket token + metadata for question feed.
- Keep-alive ping from browser ensures student remains marked as active even without device.

### UX Safeguards
- Display session countdown/timer so students know when question opens.
- Provide fallback answer buttons on web (mirrors device) for accessibility; responses tagged `source=web`.

## 7. Student Feature: Results & History

### Immediate Feedback
- After each submission, backend emits `response_ack` event over WebSocket containing `{question_id, option_label, accepted_at}`.
- When admin reveals answer, students receive payload with `is_correct` and explanation snippet pulled from question metadata.
- Device feedback mirrored in web UI to help students without hardware see LED status.

### Score & Review
- `GET /api/student/sessions/{id}/score` returns totals once session closed; caching via Redis ensures instant load.
- Review page fetches `StudentHistory` snapshot showing question text, student answer, correct answer, explanation, and instructor notes.
- Allow comments: students can flag a question for clarification; stored in `ReviewComment` table for lecturer follow-up.

### Lifetime History
- Endpoint `GET /api/student/history?limit=20` paginates sessions with filters (course, date range).
- Each history item precomputes mastery tags (e.g., “Thermodynamics: 80%”) to highlight progress.
- Provide CSV export per student for their own records; requires re-auth confirmation before download.

### Privacy & Integrity
- Students can only view sessions where they were participants; enforced by `IsOwner` permission referencing `SessionParticipant`.
- Sensitive explanations (e.g., exam answers) lock behind `release_at` timestamp to let lecturers delay reveal.
- History endpoints rate-limited to prevent scraping; responses truncated to exclude other students’ data.
