import { supabase } from '@/lib/supabase';
import { StorageService } from '@/services/api/storage.service';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import type { UserDetails } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export interface AuthServiceResponse<T> {
  data: T | null;
  error: AuthError | PostgrestError | Error | null;
}

export class AuthService {
  // Get current session
  async getSession(): Promise<AuthServiceResponse<Session>> {
    try {
      const { data, error } = await supabase.auth.getSession();
      return { data: data.session, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthServiceResponse<User>> {
    try {
      const { data, error } = await supabase.auth.getUser();
      return { data: data.user, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Get user profile from database
  async getUserProfile(
    userId: string
  ): Promise<AuthServiceResponse<UserDetails>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, profilephoto')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Sign in with email and password
  async signInWithPassword(
    email: string,
    password: string
  ): Promise<
    AuthServiceResponse<{
      session: Session;
      user: UserDetails;
    }>
  > {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError || !authData.session || !authData.user) {
        return { data: null, error: authError };
      }

      // Get user profile
      const { data: userData, error: userError } = await this.getUserProfile(
        authData.user.id
      );

      if (userError || !userData) {
        return { data: null, error: userError };
      }

      return {
        data: {
          session: authData.session,
          user: userData,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Sign out
  async signOut(): Promise<AuthServiceResponse<null>> {
    try {
      const { error } = await supabase.auth.signOut();
      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Sign up new user
  async signUp(
    email: string,
    password: string,
    options?: {
      name?: string;
      role?: string;
    }
  ): Promise<
    AuthServiceResponse<{
      session: Session | null;
      user: User;
    }>
  > {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: options?.name,
            role: options?.role || 'user',
          },
        },
      });

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          session: data.session,
          user: data.user!,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Update user profile
  async updateUserProfile(
    userId: string,
    updates: Partial<UserDetails>
  ): Promise<AuthServiceResponse<UserDetails>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id, name, email, role, profilephoto')
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Update profile photo
  async updateProfilePhoto(
    userId: string,
    file: File,
    currentPhotoUrl?: string
  ): Promise<
    AuthServiceResponse<{
      user: UserDetails;
      photoUrl: string;
    }>
  > {
    try {
      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = StorageService.extractPathFromUrl(
          currentPhotoUrl,
          'profiles'
        );
        if (oldPath) {
          await StorageService.deleteEntityImage('profiles', oldPath);
        }
      }

      // Upload new photo
      const { publicUrl } = await StorageService.uploadEntityImage(
        'profiles',
        userId,
        file
      );

      // Update user record
      const { data: userData, error: updateError } =
        await this.updateUserProfile(userId, {
          profilephoto: publicUrl,
        });

      if (updateError || !userData) {
        return { data: null, error: updateError };
      }

      return {
        data: {
          user: userData,
          photoUrl: publicUrl,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<AuthServiceResponse<null>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Update password
  async updatePassword(
    newPassword: string
  ): Promise<AuthServiceResponse<User>> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      return { data: data.user, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Refresh session
  async refreshSession(): Promise<AuthServiceResponse<Session>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      return { data: data.session, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const authService = new AuthService();
