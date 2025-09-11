/**
 * Thin Auth and User service
 * Decouples store logic from Supabase infrastructure by exposing small, testable functions.
 *
 * Responsibilities:
 * - Authentication (session, sign in, sign out)
 * - User fetching and basic updates (profile photo URL)
 *
 * NOTE:
 * - Storage operations (upload/delete) should be handled by a dedicated storage utility/service.
 * - This service only reads/writes to Supabase Auth and "users" table.
 */

import { supabase } from '@/lib/supabase';
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
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  const session = data.session;
  if (!session) {
    // Should be rare; treat as auth failure
    throw new Error('Authentication succeeded but session is missing');
  }

  const userId = data.user?.id;
  const user = userId ? await fetchUserById(userId) : null;

  return { session, user };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Fetch a user row from "users" table
 */
export async function fetchUserById(
  userId: string
): Promise<UserPublicFields | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, profilephoto')
    .eq('id', userId)
    .single();

  if (error) {
    // If row is not found, return null; otherwise propagate error
    if (
      error.code === 'PGRST116' ||
      error.details?.includes('Results contain 0 rows')
    ) {
      return null;
    }
    throw error;
  }

  return (data as UserPublicFields) ?? null;
}

/**
 * Update user's profile photo URL
 * Storage upload should be handled by a separate service,
 * then pass the resulting public URL here to persist on DB.
 */
export async function updateUserProfilePhotoUrl(
  userId: string,
  publicUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      profilephoto: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Clear user's profile photo URL (set to null)
 */
export async function clearUserProfilePhoto(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      profilephoto: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

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
