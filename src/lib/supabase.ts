import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      "X-Client-Info": "apotek-klinik-app",
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: "public",
  },
});

// Global cleanup function for development
if (import.meta.env.DEV) {
  // Clean up any dangling connections on hot reload
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        supabase.removeAllChannels();
      } catch (error) {
        console.warn("Error cleaning up Supabase channels:", error);
      }
    });
  }
}
