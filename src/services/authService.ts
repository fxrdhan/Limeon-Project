/**
 * Thin Auth and User service
 * Delegates to API auth service for Supabase access.
 *
 * Responsibilities:
 * - Authentication (session, sign in, sign out)
 * - User fetching and basic updates (profile photo URL)
 */

import { authService as apiAuthService } from '@/services/api/auth.service';
import type { Session } from '@supabase/supabase-js';
import type { UserDetails } from '@/types';

export type UserPublicFields = Pick<
  UserDetails,
  'id' | 'name' | 'email' | 'role' | 'profilephoto'
>;

/**
 * Get current session (if any)
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await apiAuthService.getSession();
  if (error) throw error;
  return data ?? null;
}

/**
 * Sign in with email & password, then fetch user profile from "users" table
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{
  session: Session;
  user: UserPublicFields | null;
}> {
  const { data, error } = await apiAuthService.signInWithPassword(
    email,
    password
  );

  if (error || !data?.session) {
    throw error ?? new Error('Authentication succeeded but session is missing');
  }

  return { session: data.session, user: data.user ?? null };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await apiAuthService.signOut();
  if (error) throw error;
}

/**
 * Fetch a user row from "users" table
 */
export async function fetchUserById(
  userId: string
): Promise<UserPublicFields | null> {
  const { data, error } = await apiAuthService.getUserProfile(userId);

  if (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: string }).code
        : undefined;
    const errorDetails =
      typeof error === 'object' && error !== null && 'details' in error
        ? (error as { details?: string }).details
        : undefined;

    if (
      errorCode === 'PGRST116' ||
      (typeof errorDetails === 'string' &&
        errorDetails.includes('Results contain 0 rows'))
    ) {
      return null;
    }
    throw error;
  }

  return (data as UserPublicFields) ?? null;
}

/**
 * Update user's profile photo URL
 */
export async function updateUserProfilePhotoUrl(
  userId: string,
  publicUrl: string
): Promise<void> {
  const { error } = await apiAuthService.updateUserProfile(userId, {
    profilephoto: publicUrl,
  });
  if (error) throw error;
}

/**
 * Clear user's profile photo URL (set to null)
 */
export async function clearUserProfilePhoto(userId: string): Promise<void> {
  const { error } = await apiAuthService.updateUserProfile(userId, {
    profilephoto: null,
  });
  if (error) throw error;
}

/**
 * Convenience method: initialize auth state
 * - returns { session, user } if authenticated
 * - returns { session: null, user: null } if not authenticated
 */
export async function initializeAuth(): Promise<{
  session: Session | null;
  user: UserPublicFields | null;
}> {
  const session = await getCurrentSession();

  if (session?.user?.id) {
    const user = await fetchUserById(session.user.id);
    return { session, user };
  }

  return { session: null, user: null };
}

/**
 * Service facade for easier imports and mocking
 */
const authService = {
  getCurrentSession,
  signInWithEmailPassword,
  signOut,
  fetchUserById,
  updateUserProfilePhotoUrl,
  clearUserProfilePhoto,
  initializeAuth,
};

export default authService;
