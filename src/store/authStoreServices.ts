import { syncSupabaseRealtimeAuthToken } from '@/lib/supabaseRealtimeAuth';
import type { UserPublicFields } from '@/services/api/auth.service';
import type { AuthState } from '@/types';
import type { Session } from '@supabase/supabase-js';

type AuthStoreSet = (
  partial:
    | AuthState
    | Partial<AuthState>
    | ((state: AuthState) => AuthState | Partial<AuthState>)
) => void;
type AuthStoreGet = () => AuthState;

let authStateSubscription: {
  unsubscribe: () => void;
} | null = null;
let authServicePromise: Promise<
  typeof import('@/services/api/auth.service').default
> | null = null;
const pendingUserProfiles = new Map<string, Promise<UserPublicFields | null>>();

export const loadAuthService = async () => {
  if (!authServicePromise) {
    authServicePromise = import('@/services/api/auth.service').then(
      module => module.default
    );
  }

  return authServicePromise;
};

export const loadUserProfileById = async (userId: string) => {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const pendingUserProfile = pendingUserProfiles.get(normalizedUserId);
  if (pendingUserProfile) {
    return pendingUserProfile;
  }

  const nextUserProfilePromise = (async () => {
    const authService = await loadAuthService();
    return authService.fetchUserById(normalizedUserId);
  })();

  pendingUserProfiles.set(normalizedUserId, nextUserProfilePromise);

  try {
    return await nextUserProfilePromise;
  } finally {
    if (pendingUserProfiles.get(normalizedUserId) === nextUserProfilePromise) {
      pendingUserProfiles.delete(normalizedUserId);
    }
  }
};

export const markUserOfflineForLogout = async (userId: string) => {
  const { chatPresenceService } = await import('@/services/api/chat.service');
  await chatPresenceService.upsertUserPresence(userId, {
    is_online: false,
  });
};

export const syncRealtimeAuthToken = (accessToken?: string | null) => {
  syncSupabaseRealtimeAuthToken(accessToken);
};

export const clearClientBrowserStateForLogout = async () => {
  const { clearClientBrowserState } =
    await import('@/lib/browserLogoutCleanup');
  await clearClientBrowserState();
};

const syncStoreFromSession = async (
  session: Session | null,
  set: AuthStoreSet,
  get: AuthStoreGet
) => {
  syncRealtimeAuthToken(session?.access_token ?? null);

  if (!session?.user?.id) {
    set({ session: null, user: null, loading: false, error: null });
    return;
  }

  const currentUser = get().user;
  if (currentUser?.id === session.user.id) {
    set({
      session,
      user: currentUser,
      loading: false,
      error: null,
    });
    return;
  }

  try {
    const user = await loadUserProfileById(session.user.id);
    set({
      session,
      user,
      loading: false,
      error: null,
    });
  } catch (error) {
    console.error('Error syncing auth state:', error);
    set({
      session,
      user: null,
      loading: false,
      error:
        error instanceof Error ? error.message : 'Failed to sync auth state',
    });
  }
};

export const ensureAuthStateSubscription = async (
  set: AuthStoreSet,
  get: AuthStoreGet
) => {
  if (authStateSubscription) {
    return;
  }

  const authService = await loadAuthService();
  const {
    data: { subscription },
  } = authService.onAuthStateChange(
    (_event: string, session: Session | null) => {
      void syncStoreFromSession(session, set, get);
    }
  );

  authStateSubscription = subscription;
};
