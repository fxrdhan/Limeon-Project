import { supabase } from '@/lib/supabase';
import type { OnlineUser } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import type { ChatDirectoryUsersPage } from './types';

export const chatDirectoryService = {
  async getUsersPage(
    limit = 30,
    offset = 0
  ): Promise<ServiceResponse<ChatDirectoryUsersPage>> {
    const pageSize = Math.max(1, limit);

    try {
      const { data, error } = await supabase.rpc('list_chat_directory_users', {
        p_limit: pageSize + 1,
        p_offset: Math.max(0, offset),
      });

      if (error) {
        return { data: null, error };
      }

      const directoryRows = (data || []) as Array<
        Pick<OnlineUser, 'id' | 'name' | 'email' | 'profilephoto'>
      >;
      const loadedAt = new Date().toISOString();
      const users: OnlineUser[] = directoryRows
        .slice(0, pageSize)
        .map(user => ({
          ...user,
          online_at: loadedAt,
        }));

      return {
        data: {
          users,
          hasMore: directoryRows.length > pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
