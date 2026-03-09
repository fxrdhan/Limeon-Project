import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const syncRealtimeAuthToken = (accessToken?: string | null) => {
  if (!accessToken) {
    return;
  }

  try {
    void supabase.realtime.setAuth(accessToken);
  } catch (error) {
    console.warn('Failed to sync Supabase Realtime auth token:', error);
  }
};

// Connection health monitoring
let connectionHealthCheck: NodeJS.Timeout | null = null;

// Monitor connection health and attempt reconnection if needed
const startConnectionHealthCheck = () => {
  if (connectionHealthCheck) return;

  connectionHealthCheck = setInterval(async () => {
    try {
      // Lightweight REST probe to catch connectivity issues without pulling rows.
      const { error } = await supabase
        .from('users')
        .select('id', { head: true })
        .limit(1);
      if (error && error.message.includes('network')) {
        console.warn(
          '🔍 Network issue detected, realtime may need reconnection'
        );
      }
    } catch (err) {
      console.warn('🔍 Connection health check failed:', err);
    }
  }, 60000); // Check every minute
};

// Handle page visibility changes for better reconnection
if (typeof window !== 'undefined') {
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      syncRealtimeAuthToken(data.session?.access_token ?? null);
    })
    .catch(error => {
      console.warn('Failed to hydrate Supabase Realtime auth token:', error);
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncRealtimeAuthToken(session?.access_token ?? null);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible - good time to check connections
      setTimeout(() => {
        startConnectionHealthCheck();
      }, 1000);
    } else {
      // Page hidden - pause health checks to save resources
      if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
        connectionHealthCheck = null;
      }
    }
  });

  // Start health check when page loads
  startConnectionHealthCheck();
}

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
      if (connectionHealthCheck) {
        clearInterval(connectionHealthCheck);
        connectionHealthCheck = null;
      }
      void supabase.removeAllChannels();
    } catch (error) {
      console.warn('Error cleaning up Supabase channels:', error);
    }
  });
}
