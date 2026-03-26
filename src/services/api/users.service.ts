import { supabase } from '@/lib/supabase';
import type { DirectoryUser } from '@/store/createDirectoryStore';
import type { OnlineUser } from '@/types';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';
import {
  buildListChatDirectoryUsersRpcArgs,
  CHAT_RPC_NAMES,
} from './chat/rpc-contract';

export interface UserDirectoryPage {
  users: DirectoryUser[];
  hasMore: boolean;
}

export class UsersService {
  async getUsersByIds(
    userIds: string[]
  ): Promise<ServiceResponse<OnlineUser[]>> {
    const normalizedUserIds = [...new Set(userIds)].filter(Boolean);
    if (normalizedUserIds.length === 0) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, profilephoto, profilephoto_thumb')
        .in('id', normalizedUserIds)
        .order('name', { ascending: true });

      if (error) {
        return { data: null, error };
      }

      const onlineAt = new Date().toISOString();
      const users: OnlineUser[] = (data || []).map(user => ({
        ...user,
        online_at: onlineAt,
      }));

      return { data: users, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async getUsersPage(
    limit = 30,
    offset = 0
  ): Promise<ServiceResponse<UserDirectoryPage>> {
    const pageSize = Math.max(1, limit);

    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.listChatDirectoryUsers,
        buildListChatDirectoryUsersRpcArgs(pageSize + 1, Math.max(0, offset))
      );

      if (error) {
        return { data: null, error };
      }

      const directoryRows = (data || []) as DirectoryUser[];
      const users = directoryRows.slice(0, pageSize);

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
  }
}

export const usersService = new UsersService();
