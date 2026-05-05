import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env vars are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY or VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
