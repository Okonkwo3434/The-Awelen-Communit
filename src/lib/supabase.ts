import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The Project URL and anon public key come from environment variables.
// Locally: put them in a file called .env.local (see .env.example).
// On Vercel: Project Settings > Environment Variables.
// The anon key is designed to be public; security comes from the rules (RLS) inside Supabase.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, storageKey: 'awelen-auth' } }) : null;

export const supabaseReady = !!supabase;
