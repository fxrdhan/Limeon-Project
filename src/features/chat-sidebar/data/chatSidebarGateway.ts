import { StorageService } from '@/services/api/storage.service';
import {
  chatService,
  type ChatMessage,
  type ConversationMessagesPage,
  type CreateChatMessageInput,
  type EditChatMessageTextInput,
  type ChatFilePreviewUpdateInput,
  type UserPresence,
  type DeleteMessageThreadAndCleanupResult,
  type CleanupStoragePathsResult,
  type RetryChatCleanupFailuresResult,
  type UndeliveredIncomingMessageIdsPage,
} from '@/services/api/chat.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import type {
  RealtimeChannel,
  RealtimeChannelOptions,
} from '@supabase/supabase-js';

export const chatSidebarGateway = {
  getMessageById(id: string) {
    return chatService.getMessageById(id);
  },
  fetchConversationMessages(
    targetUserId: string,
    options?: {
      beforeCreatedAt?: string | null;
      beforeId?: string | null;
      limit?: number;
    }
  ) {
    return chatService.fetchMessagesBetweenUsers(targetUserId, options);
  },
  searchConversationMessages(
    targetUserId: string,
    query: string,
    limit?: number
  ) {
    return chatService.searchConversationMessages(targetUserId, query, limit);
  },
  fetchConversationMessageContext(
    targetUserId: string,
    messageId: string,
    options?: {
      beforeLimit?: number;
      afterLimit?: number;
    }
  ) {
    return chatService.fetchConversationMessageContext(
      targetUserId,
      messageId,
      options
    );
  },
  createMessage(payload: CreateChatMessageInput) {
    return chatService.insertMessage(payload);
  },
  editTextMessage(id: string, payload: EditChatMessageTextInput) {
    return chatService.editTextMessage(id, payload);
  },
  updateFilePreview(id: string, payload: ChatFilePreviewUpdateInput) {
    return chatService.updateFilePreview(id, payload);
  },
  deleteMessageThread(id: string) {
    return chatService.deleteMessageThread(id);
  },
  deleteMessageThreadAndCleanup(id: string) {
    return chatService.deleteMessageThreadAndCleanup(id);
  },
  cleanupStoragePaths(storagePaths: Array<string | null | undefined>) {
    return chatService.cleanupStoragePaths(storagePaths);
  },
  retryChatCleanupFailures() {
    return chatService.retryChatCleanupFailures();
  },
  markMessageIdsAsDelivered(messageIds: string[]) {
    return chatService.markMessageIdsAsDelivered(messageIds);
  },
  markMessageIdsAsRead(messageIds: string[]) {
    return chatService.markMessageIdsAsRead(messageIds);
  },
  listUndeliveredIncomingMessageIds(
    receiverId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ) {
    return chatService.listUndeliveredIncomingMessageIds(receiverId, options);
  },
  getUserPresence(userId: string) {
    return chatService.getUserPresence(userId);
  },
  createRealtimeChannel(name: string, options?: RealtimeChannelOptions) {
    return realtimeService.createChannel(name, options);
  },
  removeRealtimeChannel(channel: RealtimeChannel) {
    return realtimeService.removeChannel(channel);
  },
  uploadImage(bucket: string, file: File, path: string) {
    return StorageService.uploadFile(bucket, file, path);
  },
  uploadAttachment(
    bucket: string,
    file: File,
    path: string,
    contentType?: string
  ) {
    return StorageService.uploadRawFile(bucket, file, path, contentType);
  },
  deleteStorageFile(bucket: string, path: string) {
    return StorageService.deleteFile(bucket, path);
  },
  downloadStorageFile(bucket: string, path: string) {
    return StorageService.downloadFile(bucket, path);
  },
  createSignedStorageUrl(
    bucket: string,
    path: string,
    expiresInSeconds?: number
  ) {
    return StorageService.createSignedUrl(bucket, path, expiresInSeconds);
  },
};

export type {
  ChatMessage,
  CreateChatMessageInput,
  UserPresence,
  RealtimeChannel,
  ConversationMessagesPage,
  DeleteMessageThreadAndCleanupResult,
  CleanupStoragePathsResult,
  RetryChatCleanupFailuresResult,
  UndeliveredIncomingMessageIdsPage,
};
