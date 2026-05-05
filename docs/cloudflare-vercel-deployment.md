# Cloudflare + Vercel deployment

This project is set up to use:

- Vercel for the Vite frontend
- Cloudflare Workers for the edge backend gateway
- The existing Node backend as the origin API

## Current flow

`Browser -> Vercel frontend -> Cloudflare Worker -> origin backend`

The Cloudflare Worker lives in `cloudflare/pixe-edge` and forwards all backend requests to `ORIGIN_API`. Public Pixe read routes keep the existing edge caching behavior, while authenticated and mutating requests pass straight through.

## Frontend deploy target

The root app is the deployable frontend. `vercel.json` adds the SPA rewrite required for deep links.

Recommended frontend environment variables on Vercel:

```env
VITE_BACKEND_URL=https://urban-prime-edge.<your-workers-subdomain>.workers.dev
VITE_BACKEND_CANDIDATES=https://urbanprime-api.onrender.com
VITE_BACKEND_HOST_MAP=urbanprime.vercel.app=https://urban-prime-edge.<your-workers-subdomain>.workers.dev
VITE_DATA_MODE=supabase
VITE_ENABLE_FIRESTORE_FALLBACK=false
VITE_ENABLE_LOCAL_MOCK_FALLBACK=true
```

## Cloudflare Worker deploy target

Install the worker dependencies:

```bash
npm install --prefix cloudflare/pixe-edge
```

Create `cloudflare/pixe-edge/.dev.vars` from `.dev.vars.example` and set:

```env
ORIGIN_API=https://urbanprime-api.onrender.com
EDGE_BACKEND_KEY=optional-shared-secret
ALLOWED_ORIGINS=https://*.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

Then deploy:

```bash
npm --prefix cloudflare/pixe-edge run deploy
```

The Worker exposes:

- `/edge-health` for edge-only health checks
- all existing backend paths, proxied to `ORIGIN_API`
- CORS handling for Vercel preview domains and local development, including preflight `OPTIONS`

## Backend origin requirements

The origin backend still needs its production env vars. In particular:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Firebase admin credentials or `BACKEND_API_KEY`
- `CORS_ORIGIN` including the Vercel frontend origin

Example production CORS value:

```env
CORS_ORIGIN=https://urbanprime.vercel.app,https://www.yourdomain.com
```
