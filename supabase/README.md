## Supabase Backend Setup

This project uses Supabase as a persistence backend (documents stored in `mirror_documents`).

### 1) Run schema
Open the Supabase SQL editor and run `supabase/schema.sql`.

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

### 3) Verify
Start the app and open a page that lists items. New items will be saved to Firestore and mirrored to Supabase. If Firestore fails, Supabase + local cache are used as fallback to avoid data loss.
