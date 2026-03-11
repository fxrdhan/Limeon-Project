import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import {
  DEFAULT_CHAT_MESSAGES_PAGE_SIZE,
  type ChatMessage,
  type ChatFilePreviewUpdateInput,
  type ConversationMessagesPage,
  type ConversationSearchContextOptions,
  type CreateChatMessageInput,
  type EditChatMessageTextInput,
  type UndeliveredIncomingMessageIdsPage,
} from './types';
import {
  buildGetChatMessageByIdRpcArgs,
  buildCreateChatMessageRpcArgs,
  buildDeleteChatMessageThreadRpcArgs,
  buildEditChatMessageTextRpcArgs,
  buildFetchChatMessageContextRpcArgs,
  buildFetchChatMessagesPageRpcArgs,
  buildListUndeliveredIncomingMessageIdsRpcArgs,
  buildMarkChatMessageIdsAsDeliveredRpcArgs,
  buildMarkChatMessageIdsAsReadRpcArgs,
  buildSearchChatMessagesRpcArgs,
  buildUpdateChatFilePreviewMetadataRpcArgs,
  CHAT_RPC_NAMES,
} from './rpc-contract';

export const chatMessagesService = {
  async getMessageById(id: string): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.getMessageById,
        buildGetChatMessageByIdRpcArgs(id)
      );

      if (error) {
        return { data: null, error };
      }

      return {
        data: data ? (data as ChatMessage) : null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async fetchMessagesBetweenUsers(
    targetUserId: string,
    options?: {
      beforeCreatedAt?: string | null;
      beforeId?: string | null;
      limit?: number;
    }
  ): Promise<ServiceResponse<ConversationMessagesPage>> {
    try {
      const pageSize = Math.max(
        1,
        options?.limit ?? DEFAULT_CHAT_MESSAGES_PAGE_SIZE
      );
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.fetchMessagesPage,
        buildFetchChatMessagesPageRpcArgs(targetUserId, {
          ...options,
          limit: pageSize + 1,
        })
      );

      if (error) {
        return { data: null, error };
      }

      const orderedMessages = ((data || []) as ChatMessage[]).slice(
        0,
        pageSize
      );
      const hasMore = (data?.length ?? 0) > pageSize;

      return {
        data: {
          messages: orderedMessages.reverse(),
          hasMore,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async searchConversationMessages(
    targetUserId: string,
    query: string,
    limit = 200
  ): Promise<ServiceResponse<ChatMessage[]>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.searchMessages,
        buildSearchChatMessagesRpcArgs(targetUserId, normalizedQuery, limit)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async fetchConversationMessageContext(
    targetUserId: string,
    messageId: string,
    options?: ConversationSearchContextOptions
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.fetchMessageContext,
        buildFetchChatMessageContextRpcArgs(targetUserId, messageId, options)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async insertMessage(
    payload: CreateChatMessageInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.createMessage,
        buildCreateChatMessageRpcArgs(payload)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async editTextMessage(
    id: string,
    payload: EditChatMessageTextInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.editMessageText,
        buildEditChatMessageTextRpcArgs(id, payload)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateFilePreview(
    id: string,
    payload: ChatFilePreviewUpdateInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.updateFilePreviewMetadata,
        buildUpdateChatFilePreviewMetadataRpcArgs(id, payload)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessageIdsAsDelivered(
    messageIds: string[]
  ): Promise<ServiceResponse<ChatMessage[]>> {
    if (messageIds.length === 0) return { data: [], error: null };

    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.markMessageIdsAsDelivered,
        buildMarkChatMessageIdsAsDeliveredRpcArgs(messageIds)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessageIdsAsRead(
    messageIds: string[]
  ): Promise<ServiceResponse<ChatMessage[]>> {
    if (messageIds.length === 0) return { data: [], error: null };

    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.markMessageIdsAsRead,
        buildMarkChatMessageIdsAsReadRpcArgs(messageIds)
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async listUndeliveredIncomingMessageIds(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ServiceResponse<UndeliveredIncomingMessageIdsPage>> {
    try {
      const pageSize = Math.max(1, options?.limit ?? 200);
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.listUndeliveredIncomingMessageIds,
        buildListUndeliveredIncomingMessageIdsRpcArgs({
          ...options,
          limit: pageSize + 1,
        })
      );

      if (error) {
        return { data: null, error };
      }

      const orderedMessageIds = ((data || []) as string[])
        .filter((messageId): messageId is string => Boolean(messageId))
        .slice(0, pageSize);

      return {
        data: {
          messageIds: orderedMessageIds,
          hasMore: ((data || []) as string[]).length > pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async deleteMessageThread(id: string): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.deleteMessageThread,
        buildDeleteChatMessageThreadRpcArgs(id)
      );

      if (error) {
        return { data: null, error };
      }

      return {
        data: Array.isArray(data)
          ? data.filter(
              deletedMessageId =>
                typeof deletedMessageId === 'string' &&
                deletedMessageId.length > 0
            )
          : [],
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
