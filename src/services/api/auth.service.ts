import { authSupabase } from '@/lib/authSupabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import type { UserDetails } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

export interface AuthServiceResponse<T> {
  data: T | null;
  error: AuthError | PostgrestError | Error | null;
}

const USER_PROFILE_SELECT_COLUMNS =
  'id, name, email, role, profilephoto, profilephoto_thumb, profilephoto_path';

export class AuthService {
  // Get current session
  async getSession(): Promise<AuthServiceResponse<Session>> {
    try {
      const { data, error } = await authSupabase.auth.getSession();
      return { data: data.session, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthServiceResponse<User>> {
    try {
      const { data, error } = await authSupabase.auth.getUser();
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
      const { data, error } = await authSupabase
        .from('users')
        .select(USER_PROFILE_SELECT_COLUMNS)
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
      user: User;
    }>
  > {
    try {
      const { data: authData, error: authError } =
        await authSupabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError || !authData.session || !authData.user) {
        return { data: null, error: authError };
      }

      return {
        data: {
          session: authData.session,
          user: authData.user,
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
      const { error } = await authSupabase.auth.signOut();
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
      const { data, error } = await authSupabase.auth.signUp({
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
      const { data, error } = await authSupabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select(USER_PROFILE_SELECT_COLUMNS)
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
    currentPhotoUrl?: string,
    currentThumbnailUrl?: string | null,
    currentPhotoPath?: string | null
  ): Promise<
    AuthServiceResponse<{
      user: UserDetails;
      photoUrl: string;
      thumbnailUrl: string | null;
    }>
  > {
    try {
      const [{ StorageService }, { buildProfilePhotoUploadPlan }] =
        await Promise.all([
          import('@/services/api/storage.service'),
          import('@/utils/profilePhoto'),
        ]);

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath =
          currentPhotoPath ||
          StorageService.extractPathFromUrl(currentPhotoUrl, 'profiles');
        if (oldPath) {
          await StorageService.deleteEntityImage('profiles', oldPath);
        }
      }
      if (currentThumbnailUrl) {
        const oldThumbnailPath = StorageService.extractPathFromUrl(
          currentThumbnailUrl,
          'profiles'
        );
        if (oldThumbnailPath) {
          await StorageService.deleteEntityImage('profiles', oldThumbnailPath);
        }
      }

      const uploadPlan = await buildProfilePhotoUploadPlan(userId, file);

      // Upload new photo
      const { publicUrl } = await StorageService.uploadFile(
        'profiles',
        file,
        uploadPlan.originalPath
      );
      let thumbnailUrl: string | null = null;
      if (uploadPlan.thumbnailFile && uploadPlan.thumbnailPath) {
        const thumbnailUpload = await StorageService.uploadRawFile(
          'profiles',
          uploadPlan.thumbnailFile,
          uploadPlan.thumbnailPath,
          uploadPlan.thumbnailFile.type
        );
        thumbnailUrl = thumbnailUpload.publicUrl;
      }

      // Update user record
      const { data: userData, error: updateError } =
        await this.updateUserProfile(userId, {
          profilephoto: publicUrl,
          profilephoto_path: uploadPlan.originalPath,
          profilephoto_thumb: thumbnailUrl,
        });

      if (updateError || !userData) {
        return { data: null, error: updateError };
      }

      return {
        data: {
          user: userData,
          photoUrl: publicUrl,
          thumbnailUrl,
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
      const { error } = await authSupabase.auth.resetPasswordForEmail(email);
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
      const { data, error } = await authSupabase.auth.updateUser({
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
    return authSupabase.auth.onAuthStateChange(callback);
  }

  // Refresh session
  async refreshSession(): Promise<AuthServiceResponse<Session>> {
    try {
      const { data, error } = await authSupabase.auth.refreshSession();
      return { data: data.session, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const authService = new AuthService();
