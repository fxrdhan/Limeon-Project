import { supabase } from '@/lib/supabase';

let isRealtimeAuthSyncInitialized = false;

const syncRealtimeAuthToken = (accessToken?: string | null) => {
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
      syncRealtimeAuthToken(data.session?.access_token ?? null);
    })
    .catch(error => {
      console.warn('Failed to hydrate Supabase Realtime auth token:', error);
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    syncRealtimeAuthToken(session?.access_token ?? null);
  });
};
