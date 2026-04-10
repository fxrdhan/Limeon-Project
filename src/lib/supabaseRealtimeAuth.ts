import { supabase } from '@/lib/supabase';

let isRealtimeAuthSyncInitialized = false;

export const syncSupabaseRealtimeAuthToken = (accessToken?: string | null) => {
  try {
    void supabase.realtime.setAuth(accessToken ?? null);
  } catch (error) {
    console.warn('Failed to sync Supabase Realtime auth token:', error);
  }
};

export const initializeSupabaseRealtimeAuthSync = () => {
  if (isRealtimeAuthSyncInitialized || typeof window === 'undefined') {
    return;
  }

  isRealtimeAuthSyncInitialized = true;

  void supabase.auth
    .getSession()
    .then(({ data }) => {
      syncSupabaseRealtimeAuthToken(data.session?.access_token ?? null);
    })
    .catch(error => {
      console.warn('Failed to hydrate Supabase Realtime auth token:', error);
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncSupabaseRealtimeAuthToken(session?.access_token ?? null);
  });
};
