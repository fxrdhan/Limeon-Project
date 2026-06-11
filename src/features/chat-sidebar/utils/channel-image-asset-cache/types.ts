import type { ChatMessage } from '../../data/chatSidebarGateway';

export type ChannelImageAssetVariant = 'thumbnail' | 'full';

export type CacheableImageMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_preview_url'
  | 'file_storage_path'
>;

export interface PersistedChannelImageAssetRecord {
  blob: Blob;
  byteSize: number;
  channelId: string;
  key: string;
  lastAccessedAt: number;
  messageId: string;
  mimeType: string;
  updatedAt: number;
  variant: ChannelImageAssetVariant;
}

export interface RuntimeChannelImageAssetRecord {
  byteSize: number;
  channelId: string;
  messageId: string;
  objectUrl: string;
  variant: ChannelImageAssetVariant;
}
