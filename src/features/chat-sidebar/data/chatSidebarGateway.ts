import type { ServiceResponse } from '@/services/api/base.service';
import {
  chatCleanupService,
  chatMessagesService,
  chatPresenceService,
  type ChatMessage,
  type ChatFilePreviewUpdateInput,
  type ConversationMessagesPage,
  type ConversationSearchContextOptions,
  type CreateChatMessageInput,
  type EditChatMessageTextInput,
  type UserPresenceUpdateInput,
} from '@/services/api/chat.service';

export type {
  ChatMessage,
  CreateChatMessageInput,
  UserPresence,
  ConversationMessagesPage,
  DeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResult,
  CleanupStoragePathsResult,
  RetryChatCleanupFailuresResult,
  UndeliveredIncomingMessageIdsPage,
} from '@/services/api/chat.service';

export type { RealtimeChannel } from '@supabase/supabase-js';

const normalizeConversationMessagesPage = (
  payload: ConversationMessagesPage | ChatMessage[] | null | undefined
): ConversationMessagesPage =>
  Array.isArray(payload)
    ? {
        messages: payload,
        hasMore: false,
      }
    : {
        messages: payload?.messages || [],
        hasMore: payload?.hasMore ?? false,
      };

export const chatSidebarMessagesGateway = {
  getMessageById(id: string) {
    return chatMessagesService.getMessageById(id);
  },
  async fetchConversationMessages(
    targetUserId: string,
    options?: Parameters<
      typeof chatMessagesService.fetchMessagesBetweenUsers
    >[1]
  ): Promise<ServiceResponse<ConversationMessagesPage>> {
    const result = await chatMessagesService.fetchMessagesBetweenUsers(
      targetUserId,
      options
    );

    if (result.error || !result.data) {
      return {
        ...result,
        data: null,
      };
    }

    return {
      ...result,
      data: normalizeConversationMessagesPage(result.data),
    };
  },
  searchConversationMessages(targetUserId: string, query: string, limit = 200) {
    return chatMessagesService.searchConversationMessages(
      targetUserId,
      query,
      limit
    );
  },
  fetchConversationMessageContext(
    targetUserId: string,
    messageId: string,
    options?: ConversationSearchContextOptions
  ) {
    return chatMessagesService.fetchConversationMessageContext(
      targetUserId,
      messageId,
      options
    );
  },
  createMessage(payload: CreateChatMessageInput) {
    return chatMessagesService.insertMessage(payload);
  },
  editTextMessage(id: string, payload: EditChatMessageTextInput) {
    return chatMessagesService.editTextMessage(id, payload);
  },
  updateFilePreview(id: string, payload: ChatFilePreviewUpdateInput) {
    return chatMessagesService.updateFilePreview(id, payload);
  },
  markMessageIdsAsDelivered(messageIds: string[]) {
    return chatMessagesService.markMessageIdsAsDelivered(messageIds);
  },
  markMessageIdsAsRead(messageIds: string[]) {
    return chatMessagesService.markMessageIdsAsRead(messageIds);
  },
  listUndeliveredIncomingMessageIds(
    options?: Parameters<
      typeof chatMessagesService.listUndeliveredIncomingMessageIds
    >[0]
  ) {
    return chatMessagesService.listUndeliveredIncomingMessageIds(options);
  },
  deleteMessageThread(id: string) {
    return chatMessagesService.deleteMessageThread(id);
  },
};

export const chatSidebarCleanupGateway = {
  deleteMessageThreadAndCleanup(id: string) {
    return chatCleanupService.deleteMessageThreadAndCleanup(id);
  },
  deleteMessageThreadsAndCleanup(messageIds: Array<string | null | undefined>) {
    return chatCleanupService.deleteMessageThreadsAndCleanup(messageIds);
  },
  cleanupStoragePaths(storagePaths: Array<string | null | undefined>) {
    return chatCleanupService.cleanupStoragePaths(storagePaths);
  },
  retryChatCleanupFailures() {
    return chatCleanupService.retryChatCleanupFailures();
  },
};

export const chatSidebarPresenceGateway = {
  getUserPresence(userId: string) {
    return chatPresenceService.getUserPresence(userId);
  },
  upsertUserPresence(
    userId: string,
    payload: Pick<UserPresenceUpdateInput, 'is_online'>
  ) {
    return chatPresenceService.upsertUserPresence(userId, payload);
  },
  syncUserPresenceOnlineState(userId: string, isOnline: boolean) {
    return chatPresenceService.syncUserPresenceOnlineState(userId, isOnline);
  },
  syncUserPresenceOnPageExit(
    userId: string,
    accessToken?: string | null,
    timestamp?: string
  ) {
    return chatPresenceService.syncUserPresenceOnPageExit(
      userId,
      accessToken,
      timestamp
    );
  },
};
