import { supabase } from '@/lib/supabase';
import type { CompanyProfile } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export class CompanyProfileService {
  async getProfile(): Promise<ServiceResponse<CompanyProfile | null>> {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .single();

      if (error) {
        // No rows found -> treat as empty profile
        if (error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        return { data: null, error };
      }

      return { data: data ?? null, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async updateProfileField(
    profileId: string,
    field: string,
    value: string | null
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({ [field]: value === '' ? null : value })
        .eq('id', profileId);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async createProfile(
    payload: Pick<CompanyProfile, 'name' | 'address'> & Partial<CompanyProfile>
  ): Promise<ServiceResponse<CompanyProfile>> {
    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .insert(payload)
        .select()
        .single();

      return { data: data ?? null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}

export const companyProfileService = new CompanyProfileService();
