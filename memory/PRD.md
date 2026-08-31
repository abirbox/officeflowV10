# OfficeFlow V10 — PRD

## Original problem statement
Load the updated OfficeFlow V10 codebase (https://github.com/abirbox/officeflowV10.git)
and make it run/preview. (Supersedes the earlier V9 client load and iterative client-portal
features, which V10 already incorporates.)

## Architecture
- **Backend**: FastAPI (`/app/backend`), routers mounted under `/api`, MongoDB via `MONGO_URL`,
  cookie-based JWT auth. Local filesystem storage at `/app/backend/uploads` served via `/api/files/*`.
  WebSocket `/api/ws/dispatch` for real-time dispatch (fails harmlessly in preview ingress).
- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui. Axios relative `/api` (same origin),
  zustand `authStore` with `checkAuth`/`hasCheckedAuth`; `GuestRoute`/`ProtectedRoute` gates.
- **Domain**: Office/HR + Dispatch — employees, attendance, GPS tasks, leaves, overtime, payroll,
  shifts, dispatch (clients/vendors/officers/post-sites/schedules/invoices/payments/reports/audit),
  and a client portal (dashboard, schedules, officers, post-sites, vendors, Payment SO, Wage Report,
  Invoices, Company Profile).

## Load / setup done (2026-06)
- Cloned V10 into `/app`, preserving `.git`, `.emergent`, existing `.env` files, and `node_modules`.
- backend/.env kept: MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET, FRONTEND_URL, ADMIN_EMAIL/PASSWORD.
- Installed backend deps from requirements.txt (excluded already-present emergentintegrations/litellm
  URL wheel to avoid a pip resolver conflict). `yarn install` for frontend. Both run under supervisor.
- Same MongoDB as before (data preserved), so existing accounts/records remain.

## Verified (testing agent iteration_20 — real browser)
- Backend 100%, frontend 100%. `/api/health` healthy; admin + client logins 200; `/api/auth/me` 401 ~115ms.
- Admin: login → workspace chooser → Dispatch Portal; Schedule, Invoices, Payment SO, Wage Report
  (reports), Audit Log all load with data.
- Client portal: login → dashboard; Payment SO, Wage Report, Invoices, Company Profile all load,
  scoped to the client's account.
- NOTE: the lightweight screenshot tool's browser could not complete the `/api/auth/me` XHR, so it hung
  on the guest-route "Loading..." spinner — a harness artifact, not an app bug.

## Test credentials
- Admin (super_admin): admin@example.com / admin123
- Client: info@arseas.com / Client@123 (Arseas Security Services INC) — login at /client-portal/login

## Routes
- Admin nested under `/dashboard/dispatch/*` (schedules, invoices, payment-so, reports, audit).
- Client portal: `/client-portal/{dashboard,today,schedules,calendar,officers,post-sites,vendors,payments,wage-report,invoices,profile}`.

## Backlog / next
- Optional: silence the harmless `/api/ws/dispatch` WebSocket warnings in preview.
- Pending UI task (from earlier): style the dispatch "Clock Out" button (red bg, black text).

## Per-user local timezone (2026-06)
- Times now display in each viewer's own local timezone, auto-detected from the
  browser/device on load (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Manual override available to every user + client via a globe menu in both top bars
  (`components/TimezoneMenu.js`); persisted to `localStorage` and to the user account
  (`PUT /api/auth/me/timezone`, `timezone` field on the user + in `/auth/me` & `/login`).
- Business dates (schedule dates, wage-report months, invoice periods) stay FIXED for
  everyone (rendered literally, never tz-shifted). Only real timestamps convert and carry
  a short zone label (e.g. "13:37 GMT+6"). Implemented in `lib/datetime.js` (active-tz model)
  and `contexts/TimezoneContext.js`.
- Dispatch dashboard "today" counts follow the viewer's zone via `?tz=` →
  `utils/tz.today_iso_in_tz`.
- Verified: testing agent iteration_21 (real browser) — 100% frontend, business-date
  invariance + timestamp conversion confirmed across admin + client portals.
