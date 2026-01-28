import { create } from 'zustand';
import authService from '@/services/authService';
import { StorageService } from '@/services/api/storage.service';
import type { AuthState } from '@/types';

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const { session, user } = await authService.initializeAuth();
      set({ session, user, loading: false });
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
      set({ loading: true });
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
