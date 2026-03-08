import { supabase } from '@/lib/supabase';
import type { OnlineUser } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export class UsersService {
  async getAllUsers(): Promise<ServiceResponse<OnlineUser[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, profilephoto')
        .order('name', { ascending: true });

      if (error) {
        return { data: null, error };
      }

      const users: OnlineUser[] = (data || []).map(user => ({
        ...user,
        online_at: new Date().toISOString(),
      }));

      return { data: users, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}

export const usersService = new UsersService();
