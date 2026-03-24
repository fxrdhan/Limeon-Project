import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import {
  DEFAULT_CHAT_MESSAGES_PAGE_SIZE,
  type ChatMessage,
  type ChatFilePreviewUpdateInput,
  type ConversationMessagesPage,
  type ConversationSearchContextOptions,
  type ConversationSearchMessagesOptions,
  type ConversationSearchMessagesPage,
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
import { toChatServiceError } from './contractErrors';
import { normalizeChatMessage, normalizeChatMessages } from './normalizers';

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
        data: normalizeChatMessage(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      const normalizedMessages = normalizeChatMessages(data || []);
      const orderedMessages = normalizedMessages.slice(0, pageSize);
      const hasMore = normalizedMessages.length > pageSize;

      return {
        data: {
          messages: orderedMessages.reverse(),
          hasMore,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  async searchConversationMessages(
    targetUserId: string,
    query: string,
    options?: ConversationSearchMessagesOptions
  ): Promise<ServiceResponse<ConversationSearchMessagesPage>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return {
        data: {
          messages: [],
          hasMore: false,
        },
        error: null,
      };
    }

    try {
      const pageSize = Math.max(1, options?.limit ?? 200);
      const { data, error } = await supabase.rpc(
        CHAT_RPC_NAMES.searchMessages,
        buildSearchChatMessagesRpcArgs(targetUserId, normalizedQuery, {
          ...options,
          limit: pageSize + 1,
        })
      );

      if (error) {
        return { data: null, error };
      }

      const normalizedMessages = normalizeChatMessages(data || []);
      const matchedMessages = normalizedMessages.slice(0, pageSize);
      const hasMore = normalizedMessages.length > pageSize;

      return {
        data: {
          messages: matchedMessages,
          hasMore,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessages(data || []), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessage(data), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessage(data), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessage(data), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessages(data || []), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
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

      return { data: normalizeChatMessages(data || []), error: null };
    } catch (error) {
      return { data: null, error: toChatServiceError(error) };
    }
  },

  sendReadReceiptKeepalive(messageIds: string[], accessToken?: string | null) {
    const normalizedMessageIds = [...new Set(messageIds)].filter(Boolean);
    if (
      typeof window === 'undefined' ||
      typeof fetch !== 'function' ||
      normalizedMessageIds.length === 0 ||
      !accessToken
    ) {
      return false;
    }

    try {
      void fetch(
        new URL(
          `${supabaseUrl}/rest/v1/rpc/${CHAT_RPC_NAMES.markMessageIdsAsRead}`
        ).toString(),
        {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            p_message_ids: normalizedMessageIds,
          }),
          keepalive: true,
        }
      ).catch(error => {
        console.error('Keepalive read receipt sync failed:', error);
      });

      return true;
    } catch (error) {
      console.error('Error starting keepalive read receipt sync:', error);
      return false;
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
