import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IS_DEMO } from '@/lib/demo/mode';
import { createDemoClient } from '@/lib/demo/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/** True when real backend calls can be made (always true inside the demo, which answers locally). */
export const isSupabaseConfigured = IS_DEMO || Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * In demo mode (see src/lib/demo/mode.ts) every call is served by an
 * in-memory client with sample data; nothing reaches the real project.
 */
export const supabase: SupabaseClient = IS_DEMO
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
