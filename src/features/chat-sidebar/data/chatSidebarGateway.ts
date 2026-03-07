import { StorageService } from '@/services/api/storage.service';
import {
  chatService,
  type ChatMessage,
  type ChatMessageInsertInput,
  type ChatMessageUpdateInput,
  type UserPresence,
  type UserPresenceInsertInput,
  type UserPresenceUpdateInput,
} from '@/services/api/chat.service';
import { realtimeService } from '@/services/realtime/realtime.service';
import type {
  RealtimeChannel,
  RealtimeChannelOptions,
} from '@supabase/supabase-js';

export const chatSidebarGateway = {
  fetchConversationMessages(
    userId: string,
    targetUserId: string,
    channelId?: string | null
  ) {
    return chatService.fetchMessagesBetweenUsers(
      userId,
      targetUserId,
      channelId
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
  getUserPresence(userId: string) {
    return chatService.getUserPresence(userId);
  },
  updateUserPresence(userId: string, payload: UserPresenceUpdateInput) {
    return chatService.updateUserPresence(userId, payload);
  },
  insertUserPresence(payload: UserPresenceInsertInput) {
    return chatService.insertUserPresence(payload);
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
};

export type {
  ChatMessage,
  ChatMessageInsertInput,
  UserPresence,
  RealtimeChannel,
};
