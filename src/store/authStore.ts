import { create } from 'zustand';
import authService from '@/services/authService';
import { chatService } from '@/services/api/chat.service';
import { StorageService } from '@/services/api/storage.service';
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

const syncStoreFromSession = async (
  session: Session | null,
  set: AuthStoreSet,
  get: AuthStoreGet
) => {
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

const ensureAuthStateSubscription = (set: AuthStoreSet, get: AuthStoreGet) => {
  if (authStateSubscription) {
    return;
  }

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
    ensureAuthStateSubscription(set, get);
    try {
      const { session, user } = await authService.initializeAuth();
      set({ session, user, loading: false, error: null });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { session, user } = await authService.signInWithEmailPassword(
        email,
        password
      );

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
      set({ loading: true });
      if (user?.id) {
        try {
          await chatService.upsertUserPresence(user.id, {
            is_online: false,
          });
        } catch (presenceError) {
          console.warn(
            'Failed to mark user offline during logout:',
            presenceError
          );
        }
      }
      await authService.signOut();
      set({ session: null, user: null, loading: false });
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
      if (user.profilephoto) {
        const oldPath = StorageService.extractPathFromUrl(
          user.profilephoto,
          'profiles'
        );
        if (oldPath) {
          await StorageService.deleteEntityImage('profiles', oldPath);
        }
      }

      const { publicUrl } = await StorageService.uploadEntityImage(
        'profiles',
        user.id,
        file
      );

      await authService.updateUserProfilePhotoUrl(user.id, publicUrl);

      set(state => ({
        /* c8 ignore next */
        user: state.user ? { ...state.user, profilephoto: publicUrl } : null,
      }));
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
      // Delete the current profile photo from storage if it exists
      if (user.profilephoto) {
        const oldPath = StorageService.extractPathFromUrl(
          user.profilephoto,
          'profiles'
        );
        if (oldPath) {
          await StorageService.deleteEntityImage('profiles', oldPath);
        }
      }

      await authService.clearUserProfilePhoto(user.id);

      // Update state
      set(state => ({
        /* c8 ignore next */
        user: state.user ? { ...state.user, profilephoto: null } : null,
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
