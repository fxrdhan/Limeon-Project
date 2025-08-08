import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { StorageService } from '@/utils/storage';
import type { AuthState } from '@/types';

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, role, profilephoto')
          .eq('id', data.session.user.id)
          .single();

        set({
          session: data.session,
          user: userData,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: userData } = await supabase
        .from('users')
        .select('id, name, email, role, profilephoto')
        .eq('id', data.user?.id)
        .single();

      set({
        session: data.session,
        user: userData,
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
      await supabase.auth.signOut();
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

      const { error: updateError } = await supabase
        .from('users')
        .update({
          profilephoto: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

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

      // Update database to remove profile photo
      const { error: updateError } = await supabase
        .from('users')
        .update({
          profilephoto: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

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
