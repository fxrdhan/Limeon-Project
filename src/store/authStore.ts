import { create } from 'zustand';
import { PROFILE_PHOTO_BUCKET } from '../../shared/profilePhotoPaths';
import type { AuthState } from '@/types';
import { syncSupabaseRealtimeAuthToken } from '@/lib/supabaseRealtimeAuth';
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
  typeof import('@/services/authService').default
> | null = null;

const loadAuthService = async () => {
  if (!authServicePromise) {
    authServicePromise = import('@/services/authService').then(
      module => module.default
    );
  }

  return authServicePromise;
};

const syncStoreFromSession = async (
  session: Session | null,
  set: AuthStoreSet,
  get: AuthStoreGet
) => {
  syncSupabaseRealtimeAuthToken(session?.access_token ?? null);

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
    const authService = await loadAuthService();
    const user = await authService.fetchUserById(session.user.id);
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

const ensureAuthStateSubscription = async (
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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const authService = await loadAuthService();
      await ensureAuthStateSubscription(set, get);
      const { session, user } = await authService.initializeAuth();
      syncSupabaseRealtimeAuthToken(session?.access_token ?? null);
      set({ session, user, loading: false, error: null });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const authService = await loadAuthService();

      const { session, user } = await authService.signInWithEmailPassword(
        email,
        password
      );
      syncSupabaseRealtimeAuthToken(session.access_token);

      set({
        session,
        user,
        loading: false,
      });
    } catch (error: unknown) {
      console.error('Login error:', error);
      set({
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
    }
  },

  logout: async () => {
    try {
      const { user } = get();
      set({ loading: true, error: null });
      if (user?.id) {
        try {
          const { chatPresenceService } =
            await import('@/services/api/chat.service');
          await chatPresenceService.upsertUserPresence(user.id, {
            is_online: false,
          });
        } catch (presenceError) {
          console.warn(
            'Failed to mark user offline during logout:',
            presenceError
          );
        }
      }
      const authService = await loadAuthService();
      await authService.signOut();
      syncSupabaseRealtimeAuthToken(null);
      const { clearClientBrowserState } =
        await import('@/lib/browserLogoutCleanup');
      await clearClientBrowserState();
      set({ session: null, user: null, loading: false });

      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    } catch (error: unknown) {
      console.error('Logout error:', error);
      set({
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
        loading: false,
      });
    }
  },

  updateProfilePhoto: async (file: File) => {
    const { user, session } = get();
    if (!session || !user) {
      set({ error: 'User not authenticated' });
      return;
    }
    set({ error: null });
    try {
      const authService = await loadAuthService();
      const [{ StorageService }, { buildProfilePhotoUploadPlan }] =
        await Promise.all([
          import('@/services/api/storage.service'),
          import('@/utils/profilePhoto'),
        ]);

      if (user.profilephoto) {
        const oldPath =
          user.profilephoto_path ||
          StorageService.extractPathFromUrl(
            user.profilephoto,
            PROFILE_PHOTO_BUCKET
          );
        if (oldPath) {
          await StorageService.deleteEntityImage(PROFILE_PHOTO_BUCKET, oldPath);
        }
      }
      if (user.profilephoto_thumb) {
        const oldThumbnailPath = StorageService.extractPathFromUrl(
          user.profilephoto_thumb,
          PROFILE_PHOTO_BUCKET
        );
        if (oldThumbnailPath) {
          await StorageService.deleteEntityImage(
            PROFILE_PHOTO_BUCKET,
            oldThumbnailPath
          );
        }
      }

      const uploadPlan = await buildProfilePhotoUploadPlan(user.id, file);
      const { publicUrl } = await StorageService.uploadFile(
        PROFILE_PHOTO_BUCKET,
        file,
        uploadPlan.originalPath
      );
      let thumbnailUrl: string | null = null;
      if (uploadPlan.thumbnailFile && uploadPlan.thumbnailPath) {
        const thumbnailUpload = await StorageService.uploadRawFile(
          PROFILE_PHOTO_BUCKET,
          uploadPlan.thumbnailFile,
          uploadPlan.thumbnailPath,
          uploadPlan.thumbnailFile.type
        );
        thumbnailUrl = thumbnailUpload.publicUrl;
      }

      const updatedUser = await authService.updateUserProfilePhotoAssets(
        user.id,
        {
          profilephoto: publicUrl,
          profilephoto_thumb: thumbnailUrl,
          profilephoto_path: uploadPlan.originalPath,
        }
      );

      set({
        user:
          updatedUser ??
          ({
            ...user,
            profilephoto: publicUrl,
            profilephoto_thumb: thumbnailUrl,
            profilephoto_path: uploadPlan.originalPath,
          } as typeof user),
      });
    } catch (error: unknown) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update profile photo',
      });
      throw error; // Re-throw so the component can handle it
    }
  },

  deleteProfilePhoto: async () => {
    const { user, session } = get();
    if (!session || !user) {
      set({ error: 'User not authenticated' });
      return;
    }
    set({ error: null });
    try {
      const authService = await loadAuthService();
      const { StorageService } = await import('@/services/api/storage.service');

      // Delete the current profile photo from storage if it exists
      if (user.profilephoto) {
        const oldPath =
          user.profilephoto_path ||
          StorageService.extractPathFromUrl(
            user.profilephoto,
            PROFILE_PHOTO_BUCKET
          );
        if (oldPath) {
          await StorageService.deleteEntityImage(PROFILE_PHOTO_BUCKET, oldPath);
        }
      }
      if (user.profilephoto_thumb) {
        const oldThumbnailPath = StorageService.extractPathFromUrl(
          user.profilephoto_thumb,
          PROFILE_PHOTO_BUCKET
        );
        if (oldThumbnailPath) {
          await StorageService.deleteEntityImage(
            PROFILE_PHOTO_BUCKET,
            oldThumbnailPath
          );
        }
      }

      await authService.clearUserProfilePhoto(user.id);

      // Update state
      set(state => ({
        /* c8 ignore next */
        user: state.user
          ? {
              ...state.user,
              profilephoto: null,
              profilephoto_thumb: null,
              profilephoto_path: null,
            }
          : null,
      }));
    } catch (error: unknown) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete profile photo',
      });
      throw error; // Re-throw so the component can handle it
    }
  },
}));
