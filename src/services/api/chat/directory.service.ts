import { supabase } from '@/lib/supabase';
import type { ServiceResponse } from '../base.service';
import { toChatServiceError } from './contractErrors';
import { normalizeChatDirectoryUsers } from './normalizers';
import {
  buildListChatDirectoryUsersRpcArgs,
  CHAT_RPC_NAMES,
} from './rpc-contract';
import type { ChatDirectoryUsersPage } from './types';

export const chatDirectoryService = {
  async getUsersPage(
    limit = 30,
    offset = 0
  ): Promise<ServiceResponse<ChatDirectoryUsersPage>> {
    const pageSize = Math.max(1, limit);

    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.listChatDirectoryUsers,
        buildListChatDirectoryUsersRpcArgs(pageSize + 1, Math.max(0, offset))
      );

      if (error) {
        return { data: null, error };
      }

      const directoryRows = normalizeChatDirectoryUsers(data || []);
      const users = directoryRows.slice(0, pageSize);

      return {
        data: {
          users,
          hasMore: directoryRows.length > pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },
};
