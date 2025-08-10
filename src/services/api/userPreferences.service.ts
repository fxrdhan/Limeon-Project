import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

export interface UserPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPreferenceRequest {
  preference_key: string;
  preference_value: Record<string, unknown>;
}

export interface UpdateUserPreferenceRequest {
  preference_value: Record<string, unknown>;
}

export class UserPreferencesService extends BaseService<UserPreference> {
  constructor() {
    super('user_preferences');
  }

  /**
   * Get a specific preference for the current user
   */
  async getUserPreference(
    preferenceKey: string
  ): Promise<ServiceResponse<UserPreference | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } as PostgrestError };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('preference_key', preferenceKey)
        .maybeSingle();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Get all preferences for the current user
   */
  async getAllUserPreferences(): Promise<ServiceResponse<UserPreference[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } as PostgrestError };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('preference_key');

      return { data: data || [], error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Set a preference for the current user (create or update)
   */
  async setUserPreference(
    preferenceKey: string,
    preferenceValue: Record<string, unknown>
  ): Promise<ServiceResponse<UserPreference>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } as PostgrestError };
      }

      // Use upsert to handle both create and update cases
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            preference_key: preferenceKey,
            preference_value: preferenceValue,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,preference_key',
          }
        )
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Delete a preference for the current user
   */
  async deleteUserPreference(
    preferenceKey: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } as PostgrestError };
      }

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('preference_key', preferenceKey);

      return { data: undefined, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  /**
   * Reset all preferences for the current user
   */
  async resetAllUserPreferences(): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'User not authenticated' } as PostgrestError };
      }

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id);

      return { data: undefined, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}

export const userPreferencesService = new UserPreferencesService();

// Predefined preference keys for type safety
export const PREFERENCE_KEYS = {
  // Column visibility preferences
  ITEM_COLUMN_VISIBILITY: 'item_column_visibility',
  CATEGORY_COLUMN_VISIBILITY: 'category_column_visibility',
  TYPE_COLUMN_VISIBILITY: 'type_column_visibility', 
  PACKAGE_COLUMN_VISIBILITY: 'package_column_visibility',
  DOSAGE_COLUMN_VISIBILITY: 'dosage_column_visibility',
  MANUFACTURER_COLUMN_VISIBILITY: 'manufacturer_column_visibility',
  UNIT_COLUMN_VISIBILITY: 'unit_column_visibility',
  
  // Column pinning preferences
  ITEM_COLUMN_PINNING: 'item_column_pinning',
  CATEGORY_COLUMN_PINNING: 'category_column_pinning',
  TYPE_COLUMN_PINNING: 'type_column_pinning',
  PACKAGE_COLUMN_PINNING: 'package_column_pinning',
  DOSAGE_COLUMN_PINNING: 'dosage_column_pinning',
  MANUFACTURER_COLUMN_PINNING: 'manufacturer_column_pinning',
  UNIT_COLUMN_PINNING: 'unit_column_pinning',
  
  // Other preferences
  THEME: 'theme',
  LANGUAGE: 'language',
  DASHBOARD_LAYOUT: 'dashboard_layout',
} as const;

export type PreferenceKey = typeof PREFERENCE_KEYS[keyof typeof PREFERENCE_KEYS];