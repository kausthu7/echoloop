import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseUrl = rawSupabaseUrl.replace(/^["']|["']$/g, '').trim();
export const supabaseAnonKey = rawSupabaseAnonKey.replace(/^["']|["']$/g, '').trim();

/**
 * Checks whether real Supabase credentials are configured in the environment
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
  );
}

// Initialize Supabase Client singleton
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  // If not configured in development, instantiate with placeholder to prevent module load crash,
  // but any attempt to query production data will clearly identify missing credentials.
  clientInstance = createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase: SupabaseClient = clientInstance;
