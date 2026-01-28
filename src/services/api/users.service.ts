import { supabase } from '@/lib/supabase';
import type { OnlineUser } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export class UsersService {
  async getUsersByIds(
    userIds: string[]
  ): Promise<ServiceResponse<OnlineUser[]>> {
    if (userIds.length === 0) return { data: [], error: null };

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, profilephoto')
        .in('id', userIds);

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
