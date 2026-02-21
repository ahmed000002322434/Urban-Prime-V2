## Supabase Backend Setup

This project uses Supabase as the primary data store (tables in `supabase/schema.sql`) and keeps a `mirror_documents` table for dual-write fallback.

### 1) Run schema + migrations
For a fresh project, run `supabase/schema.sql`.
For an existing project, run migrations in `supabase/migrations` in filename order.
Current migration set includes:
- `supabase/migrations/20260218_onboarding_v2.sql` (onboarding state + profile completion backfill).

### 2) Env vars
Set the following in `.env.local`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```
If you prefer, you can use:
```
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3) RLS note (Firebase auth)
This schema includes RLS policies that assume either:
- `service_role` access from a backend service, or
- a JWT that provides `firebase_uid` so `current_firebase_uid()` can match rows.

If you are only testing from the frontend, you can temporarily relax RLS in Supabase or use a backend service with the service role key.

### 4) Backend service (Node/Express)
A minimal backend lives in `server/`.

1. Copy `server/.env.example` to `server/.env` and fill:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
BACKEND_API_KEY=some-strong-key
```
2. Install deps and start:
```
cd server
npm install
npm run dev
```
3. Example requests:
- `GET /health`
- `POST /auth/sync-user`
- `GET /api/items?status=published&limit=20&order=created_at.desc`

### 5) Verify
Start the app and open a page that lists items. If Firestore fails, Supabase + local cache are used as fallback to avoid data loss.
