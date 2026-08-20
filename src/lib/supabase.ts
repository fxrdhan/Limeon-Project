import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.generated';

export const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'http://localhost:54321';
export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'test-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Global cleanup function for development / HMR
const hmrOverride = (
  globalThis as {
    __SUPABASE_HMR__?: { dispose: (cb: () => void) => void } | null;
  }
).__SUPABASE_HMR__;
const hot = hmrOverride === null ? null : (hmrOverride ?? import.meta.hot);

// Clean up any dangling connections on hot reload
if (hot) {
  hot.dispose(() => {
    try {
      void supabase.removeAllChannels();
    } catch (error) {
      console.warn('Error cleaning up Supabase channels:', error);
    }
  });
}
