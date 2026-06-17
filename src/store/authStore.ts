import { create } from 'zustand';
import type { AuthState } from '@/types';
import {
  deleteAuthProfilePhotoAssets,
  updateAuthProfilePhotoAssets,
} from './authStoreProfilePhotoServices';
import {
  clearClientBrowserStateForLogout,
  ensureAuthStateSubscription,
  loadAuthService,
  loadUserProfileById,
  markUserOfflineForLogout,
  syncRealtimeAuthToken,
} from './authStoreServices';

let loginInFlight = false;
let logoutInFlight = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const authService = await loadAuthService();
      await ensureAuthStateSubscription(set, get);
      const session = await authService.getCurrentSession();
      const user = session?.user?.id
        ? await loadUserProfileById(session.user.id)
        : null;
      syncRealtimeAuthToken(session?.access_token ?? null);
      set({ session, user, loading: false, error: null });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    if (loginInFlight) {
      return;
    }

    loginInFlight = true;
    try {
      set({ loading: true, error: null });
      const authService = await loadAuthService();

      const { session } = await authService.signInWithEmailPassword(
        email,
        password
      );
      const user = session.user.id
        ? await loadUserProfileById(session.user.id)
        : null;
      syncRealtimeAuthToken(session.access_token);

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
    } finally {
      loginInFlight = false;
    }
  },

  logout: async () => {
    if (logoutInFlight) {
      return;
    }

    logoutInFlight = true;
    try {
      const { user } = get();
      set({ loading: true, error: null });
      if (user?.id) {
        try {
          await markUserOfflineForLogout(user.id);
        } catch (presenceError) {
          console.warn(
            'Failed to mark user offline during logout:',
            presenceError
          );
        }
      }
      const authService = await loadAuthService();
      await authService.signOut();
      syncRealtimeAuthToken(null);
      await clearClientBrowserStateForLogout();
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
      logoutInFlight = false;
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
      const updatedUser = await updateAuthProfilePhotoAssets({
        authService,
        file,
        user,
      });
      set({
        user: updatedUser,
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
      await deleteAuthProfilePhotoAssets({ authService, user });

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
