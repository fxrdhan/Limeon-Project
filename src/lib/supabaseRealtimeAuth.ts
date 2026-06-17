import { supabase } from '@/lib/supabase';

let isRealtimeAuthSyncInitialized = false;
let realtimeAuthSyncVersion = 0;

const applySupabaseRealtimeAuthToken = (accessToken?: string | null) => {
  try {
    void supabase.realtime.setAuth(accessToken ?? null);
  } catch (error) {
    console.warn('Failed to sync Supabase Realtime auth token:', error);
  }
};

export const syncSupabaseRealtimeAuthToken = (accessToken?: string | null) => {
  realtimeAuthSyncVersion += 1;
  applySupabaseRealtimeAuthToken(accessToken);
};

export const initializeSupabaseRealtimeAuthSync = () => {
  if (isRealtimeAuthSyncInitialized || typeof window === 'undefined') {
    return;
  }

  isRealtimeAuthSyncInitialized = true;
  const initialHydrationVersion = realtimeAuthSyncVersion;

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      if (realtimeAuthSyncVersion !== initialHydrationVersion) {
        return;
      }

      applySupabaseRealtimeAuthToken(data.session?.access_token ?? null);
    })
    .catch(error => {
      console.warn('Failed to hydrate Supabase Realtime auth token:', error);
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncSupabaseRealtimeAuthToken(session?.access_token ?? null);
  });
};
