import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
    timeout: 20000,
  },
  global: {
    headers: {
      'X-Client-Info': 'apotek-klinik-app',
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Connection health monitoring
let connectionHealthCheck: NodeJS.Timeout | null = null;

// Monitor connection health and attempt reconnection if needed
const startConnectionHealthCheck = () => {
  if (connectionHealthCheck) return;

  connectionHealthCheck = setInterval(async () => {
    try {
      // Simple health check by testing connection
      const { error } = await supabase.from('users').select('count').limit(1);
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
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible - good time to check connections
      setTimeout(() => {
        console.log('📱 Page visible - checking realtime connections...');
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

// Global cleanup function for development
if (import.meta.env.DEV) {
  // Clean up any dangling connections on hot reload
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        if (connectionHealthCheck) {
          clearInterval(connectionHealthCheck);
          connectionHealthCheck = null;
        }
        supabase.removeAllChannels();
      } catch (error) {
        console.warn('Error cleaning up Supabase channels:', error);
      }
    });
  }
}
