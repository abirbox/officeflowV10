# OfficeFlow V9 — PRD

## Original problem statement
Load https://github.com/abirbox/officeflowv9client.git and make a preview with the
full code unchanged. After preview we will make changes. Planned first change: new features.

## Architecture
- **Backend**: FastAPI (`/app/backend`), 21 route modules under `/api`, MongoDB via `MONGO_URL`,
  cookie-based JWT auth (`access_token`/`refresh_token`, HttpOnly, SameSite=None, Secure).
  Local filesystem storage at `/app/backend/uploads` served via `/api/files/*`.
  WebSocket `/api/ws/dispatch` for real-time dispatch events.
- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui. Axios uses relative `/api` (same origin),
  zustand `authStore`. Pages: auth, dashboard, client portal.
- **Domain**: Office/HR management — employees, attendance, GPS tasks, leaves, overtime, payroll,
  shifts, dispatch (clients/vendors/officers/post-sites/schedules/invoices/payments), reports,
  notifications, settings (branding/colors/email/office-locations), client portal.

## Environment / setup done (2026-06)
- Cloned repo into `/app`, preserving `.git`, `.emergent`, and existing `.env` files.
- Added to `backend/.env`: `JWT_SECRET`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  (kept existing `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`).
- Installed backend deps from `requirements.txt` (excluded already-present emergentintegrations/litellm
  wheel to avoid a pip URL-resolver conflict; not imported anywhere).
- `yarn install` for frontend. Both services run under supervisor.

## Verified
- Backend health, root, and full cookie auth flow via curl: `POST /api/auth/login` → 200 (sets cookies),
  `GET /api/auth/me` with cookies → 200. Admin seeded on empty DB.
- Frontend login page renders at the preview URL.
- NOTE: The screenshot automation harness does not persist SameSite=None cookies, so its UI login
  could not advance to the dashboard; verified the underlying flow works via API. Not an app bug.

## Test credentials
- Admin (super_admin): admin@example.com / admin123 (see `/app/memory/test_credentials.md`)

## Backlog / next
- P1: Confirm dashboard + module flows via a real testing pass once user requests changes.
- P1: New features (user-requested next step) — to be scoped.
