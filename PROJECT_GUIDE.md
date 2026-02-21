# Urban Prime V2.0 – Project Guide

## What This Project Does
Urban Prime is a global marketplace app with buying, renting, auctions, sellers, dropshipping, affiliate, chat, and admin modules. It uses:
- Firebase for auth
- Supabase for the full data model (tables in `supabase/schema.sql`)
- A Node/Express backend that talks to Supabase with the service role key

## One-Time Setup
1. Install frontend deps:
   ```
   npm install
   ```
2. Install backend deps (one time):
   ```
   npm run setup:server
   ```
3. Run database schema in Supabase SQL editor:
   - File: `supabase/schema.sql`

You can also run one command:
```
npm run setup:all
```

## Local Dev (frontend + backend)
1. Create env files:
   - Copy `.env.example` to `.env.local`
   - Copy `server/.env.example` to `server/.env`

2. Start both services:
   ```
   npm run dev
   ```

Frontend runs on `http://localhost:3000` and backend on `http://localhost:5050`.

## Going Public / Online
When you deploy the backend (e.g., Render, Railway, Fly.io, VPS):
1. Set the backend env vars in the hosting dashboard.
2. Set `CORS_ORIGIN` to your production domain (comma-separated if multiple).
   Example:
   ```
   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
   ```
3. Update your frontend to use the public backend URL:
   - In `.env.local`:
     ```
     VITE_BACKEND_URL=https://api.yourdomain.com
     ```

## What Will Happen
- **Local dev:** both frontend + backend start with one command.
- **Production:** backend uses service role key for secure Supabase access.
- **Data:** all marketplace data is stored in Supabase tables. Mirror table remains for legacy fallback.

## Notes
- If you only want local testing, you can keep `CORS_ORIGIN=http://localhost:3000`.
- If backend is down, frontend still has Firebase but Supabase writes won’t happen.
