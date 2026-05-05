## Pixe Deployment Environment Checklist

Use this as the source of truth when deploying Pixe to Vercel or any other platform.

### 1. Server runtime env

Set these on the backend runtime that serves `server/src/index.js`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`

Optional but recommended:

- `MUX_DATA_TOKEN_ID`
- `MUX_DATA_TOKEN_SECRET`
- `BACKEND_API_KEY`
- `APP_PUBLIC_URL`

### 2. Frontend runtime env

Set these on the frontend deploy target:

- `VITE_BACKEND_URL`
- `VITE_BACKEND_CANDIDATES` when you have fallback backends
- `VITE_BACKEND_HOST_MAP` when host-to-backend routing is used
- `VITE_MUX_ENV_KEY` for richer player QoE telemetry

### 3. Mux webhook target

Configure the Mux webhook to point at:

- `https://<your-backend-domain>/webhooks/mux`

The signing secret in Mux must match `MUX_WEBHOOK_SECRET` on the backend.

### 4. Deploy rule

Do not rely on `.env.local` for cloud deploys.

For Vercel and other platforms:

- keep placeholders in `.env.example`
- store real secrets in the platform env settings
- set them for production and preview/staging separately

### 5. Quick verification after deploy

1. `GET /health` returns `ok: true`
2. Create a Pixe draft
3. `POST /pixe/uploads/video-session` returns `201`
4. Upload reaches Mux
5. Mux webhook marks asset ready
6. Published clip gets a valid playback URL
