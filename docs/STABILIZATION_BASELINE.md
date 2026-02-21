# Stabilization Baseline (Urban Prime V2.0)

## Branch Snapshot
- Repo: `D:\Downloads\Urban Prime V2.0`
- Date: 2026-02-15
- Baseline objective: stabilize runtime/data contracts before additional feature work.

## Critical Paths
- Auth: login/register/google/session hydration.
- Public commerce: home -> browse -> item detail -> cart -> checkout.
- Profile: public profile read + profile edit persistence.
- Dashboard shell: navigation, sticky/hover sidebar, mobile drawer.
- Activity + notifications: owner telemetry and read-state handling.
- Personas: create/switch/capability checks.
- Media upload: Pixe/listing/profile upload pipeline.

## Data Mode Policy
- `VITE_DATA_MODE=supabase` is canonical target.
- Firestore access is fallback only (`VITE_ENABLE_FIRESTORE_FALLBACK=true`).
- Local mock data is dev-only fallback (`VITE_ENABLE_LOCAL_MOCK_FALLBACK=true`).
- Backend is required for production (`VITE_REQUIRE_BACKEND=true`).

## Stability Exit Criteria
- No uncaught runtime exceptions on core paths.
- No critical pages rendering empty due to silent data fallback.
- Notifications/activity load without missing method/runtime errors.
- Profile edits persist and rehydrate.
- Dashboard theme matches global theme tokens.
- Uploads persist via backend local disk + metadata rows.

## Immediate Regression Checks
1. `npm run build` passes.
2. `npm run dev` starts both client and server.
3. `GET /health` returns `{ ok: true }`.
4. Login loads user profile without provider/hook crashes.
5. Seller dashboard loads listings/activity without stuck spinner.
6. `/profile/activity` route resolves (no 404).
7. Upload endpoint writes file + metadata and returns public URL.
