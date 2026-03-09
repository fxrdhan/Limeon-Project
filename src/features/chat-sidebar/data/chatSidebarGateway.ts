import { StorageService } from '@/services/api/storage.service';
import {
  chatService,
  type ChatMessage,
  type ConversationMessagesPage,
  type ChatMessageInsertInput,
  type ChatMessageUpdateInput,
  type UserPresence,
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
    userId: string,
    targetUserId: string,
    channelId?: string | null,
    options?: {
      beforeCreatedAt?: string | null;
      limit?: number;
    }
  ) {
    return chatService.fetchMessagesBetweenUsers(
      userId,
      targetUserId,
      channelId,
      options
    );
  },
  createMessage(payload: ChatMessageInsertInput) {
    return chatService.insertMessage(payload);
  },
  updateMessage(id: string, payload: ChatMessageUpdateInput) {
    return chatService.updateMessage(id, payload);
  },
  deleteMessage(id: string) {
    return chatService.deleteMessage(id);
  },
  deleteMessageThread(id: string) {
    return chatService.deleteMessageThread(id);
  },
  markMessageIdsAsDelivered(messageIds: string[]) {
    return chatService.markMessageIdsAsDelivered(messageIds);
  },
  markMessageIdsAsRead(messageIds: string[]) {
    return chatService.markMessageIdsAsRead(messageIds);
  },
  listUndeliveredIncomingMessageIds(receiverId: string) {
    return chatService.listUndeliveredIncomingMessageIds(receiverId);
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
  ChatMessageInsertInput,
  UserPresence,
  RealtimeChannel,
  ConversationMessagesPage,
};
