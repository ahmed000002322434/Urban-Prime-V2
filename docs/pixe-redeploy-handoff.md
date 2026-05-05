## Pixe Redeploy Handoff

Use this when redeploying Urban Prime so Pixe upload, playback, and webhooks keep working.

### 1. Where the real local keys currently live

Local backend secrets are currently in:

- [D:\Downloads\Urban Prime V2.0\server\.env.local](</D:/Downloads/Urban Prime V2.0/server/.env.local>)

Frontend runtime flags are currently in:

- [D:\Downloads\Urban Prime V2.0\.env.local](</D:/Downloads/Urban Prime V2.0/.env.local>)

Do not rely on those local files for cloud deploys. Copy the same variables into the platform env dashboard.

### 2. Required backend env vars for Pixe

These must exist on the backend runtime:

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

Reference template:

- [D:\Downloads\Urban Prime V2.0\server\.env.example](</D:/Downloads/Urban Prime V2.0/server/.env.example>)

### 3. Required frontend env vars for Pixe

These must exist on the frontend deploy target:

- `VITE_BACKEND_URL`
- `VITE_BACKEND_CANDIDATES` if there are fallback backends
- `VITE_BACKEND_HOST_MAP` if host-based backend routing is used
- `VITE_MUX_ENV_KEY` for player QoE telemetry

Reference template:

- [D:\Downloads\Urban Prime V2.0\.env.example](</D:/Downloads/Urban Prime V2.0/.env.example>)

### 4. Pixe upload flow that must not be broken

Keep this exact architecture:

1. user creates a Pixe draft
2. frontend calls `POST /pixe/uploads/video-session`
3. backend creates a Mux direct upload session when Mux env is configured
4. browser uploads the file directly to the returned `upload_url`
5. Mux calls `POST /webhooks/mux`
6. backend marks asset ready and stores playback metadata
7. feed/watch read metadata only, not raw video blobs

Files involved:

- [D:\Downloads\Urban Prime V2.0\services\pixeService.ts](</D:/Downloads/Urban Prime V2.0/services/pixeService.ts>)
- [D:\Downloads\Urban Prime V2.0\server\src\pixeRoutes.js](</D:/Downloads/Urban Prime V2.0/server/src/pixeRoutes.js>)
- [D:\Downloads\Urban Prime V2.0\server\src\muxClient.js](</D:/Downloads/Urban Prime V2.0/server/src/muxClient.js>)
- [D:\Downloads\Urban Prime V2.0\server\src\webhooks\muxWebhook.js](</D:/Downloads/Urban Prime V2.0/server/src/webhooks/muxWebhook.js>)

### 5. Upload behavior details

The frontend uploader currently:

- creates the upload session first
- uploads with `PUT`
- retries with `POST` if the upload URL answers `405`

This is important because some runtimes or fallback endpoints are method-sensitive.

### 6. Webhook requirement

Mux webhook must point to the backend domain, not the frontend domain:

- `https://<backend-domain>/webhooks/mux`

The signing secret in Mux must match:

- `MUX_WEBHOOK_SECRET`

If webhook secret is missing, startup now warns about it in:

- [D:\Downloads\Urban Prime V2.0\server\src\index.js](</D:/Downloads/Urban Prime V2.0/server/src/index.js>)

### 7. Deploy rule for Vercel and other platforms

If frontend and backend are deployed separately:

- set backend env vars on the backend host
- set frontend env vars on the frontend host
- make sure `VITE_BACKEND_URL` points to the real backend
- make sure CORS on backend allows the frontend origin

If deploying through Vercel:

- do not depend on `.env.local`
- add the same variables in Vercel Project Settings -> Environment Variables
- set them for both Production and Preview if Preview uploads must work

### 8. Minimum redeploy verification

After deploy, verify in this order:

1. `GET /health` returns `ok: true`
2. create Pixe draft
3. `POST /pixe/uploads/video-session` returns `201`
4. browser uploads file to returned `upload_url`
5. Mux webhook delivery succeeds
6. clip becomes `ready`
7. watch page plays the clip

### 9. Existing deployment note

Also read:

- [D:\Downloads\Urban Prime V2.0\docs\pixe-deployment-env.md](</D:/Downloads/Urban Prime V2.0/docs/pixe-deployment-env.md>)
