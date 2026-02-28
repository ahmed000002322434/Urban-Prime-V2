# Backend Connectivity + Offline Sync (Vercel)

This project now supports:
- runtime backend candidate discovery
- host-to-backend mapping
- offline write queue (auto-sync on reconnect)
- cached GET fallback during backend outages

## Required frontend env on Vercel

Set at least one of these:

```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

or

```env
VITE_BACKEND_HOST_MAP=urbanprimebeta.vercel.app=https://your-backend-domain.com
```

or

```env
VITE_URBANPRIMEBETA_BACKEND_URL=https://your-backend-domain.com
```

Optional:

```env
VITE_BACKEND_CANDIDATES=https://backup-backend-1.com,https://backup-backend-2.com
VITE_BACKEND_ALLOW_SAME_ORIGIN=true
VITE_BACKEND_READ_CACHE_TTL_MS=300000
```

## Required backend env

Allow the frontend origin in backend CORS:

```env
CORS_ORIGIN=https://urbanprimebeta.vercel.app
```

If you use multiple domains:

```env
CORS_ORIGIN=https://urbanprimebeta.vercel.app,https://yourdomain.com
```

## Runtime behavior

1. Client resolves backend from override, last healthy backend, host map, and env candidates.
2. If backend is unavailable:
   - `POST/PUT/PATCH/DELETE` are queued in localStorage.
   - app returns optimistic payloads for queued writes.
3. When backend becomes healthy again:
   - queue flushes automatically (`online`, `focus`, periodic retry).
4. `GET` responses are cached and reused when backend is temporarily unavailable.

## Notes

- This is not a full server replacement in the browser; it is resilient offline queuing + read cache.
- For hard real-time consistency, backend must be online.
