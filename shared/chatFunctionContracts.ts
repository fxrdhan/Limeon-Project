export type ChatCleanupAction =
  | 'delete_thread'
  | 'delete_threads'
  | 'cleanup_storage'
  | 'retry_failures';

export interface ChatCleanupRequestPayload {
  action?: ChatCleanupAction;
  messageId?: string;
  messageIds?: string[];
  storagePaths?: string[];
}

export interface DeleteMessageThreadAndCleanupRequest {
  action: 'delete_thread';
  messageId: string;
}

export interface DeleteMessageThreadsAndCleanupRequest {
  action: 'delete_threads';
  messageIds: string[];
}

export interface CleanupStoragePathsRequest {
  action: 'cleanup_storage';
  storagePaths: string[];
}

export interface RetryChatCleanupFailuresRequest {
  action: 'retry_failures';
}

export type ChatCleanupRequest =
  | DeleteMessageThreadAndCleanupRequest
  | DeleteMessageThreadsAndCleanupRequest
  | CleanupStoragePathsRequest
  | RetryChatCleanupFailuresRequest;

export interface DeleteMessageThreadAndCleanupResponse {
  deletedMessageIds: string[];
  failedStoragePaths: string[];
}

export interface DeleteMessageThreadsAndCleanupResponse {
  deletedMessageIds: string[];
  deletedTargetMessageIds: string[];
  failedTargetMessageIds: string[];
  cleanupWarningTargetMessageIds: string[];
  failedStoragePaths: string[];
}

export interface CleanupStoragePathsResponse {
  failedStoragePaths: string[];
}

export interface RetryChatCleanupFailuresResponse {
  resolvedCount: number;
  remainingCount: number;
  skippedCount: number;
}

export type ChatPdfPreviewStatus = 'pending' | 'ready' | 'failed';

export interface ChatPdfPreviewRequest {
  message_id: string;
  preview_png_base64: string;
  page_count: number;
}

export interface ChatPdfPreviewRequestPayload {
  message_id?: string;
  preview_png_base64?: string;
  page_count?: number;
}

export interface ChatPdfPreviewMessagePayload {
  id: string;
  sender_id: string;
  receiver_id?: string;
  channel_id?: string;
  message: string;
  message_type: string;
  created_at?: string;
  updated_at?: string;
  is_read?: boolean;
  is_delivered?: boolean;
  reply_to_id?: string | null;
  message_relation_kind?: string | null;
  file_name?: string | null;
  file_kind?: string | null;
  file_mime_type?: string | null;
  file_size?: number | null;
  file_storage_path?: string | null;
  file_preview_url?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: ChatPdfPreviewStatus | null;
  file_preview_error?: string | null;
  shared_link_slug?: string | null;
}

export interface ChatPdfPreviewResponse {
  message: ChatPdfPreviewMessagePayload;
  previewPersisted: boolean;
}

export interface ChatRemoteAssetRequest {
  url: string;
  fileNameSourceUrl?: string;
}

export interface ChatRemoteAssetRequestPayload {
  url?: string;
  fileNameSourceUrl?: string;
}

export type ChatPdfCompressionLevel = 'low' | 'recommended' | 'extreme';

export const CHAT_PDF_COMPRESS_DEFAULT_LEVEL: ChatPdfCompressionLevel =
  'recommended';
export const CHAT_PDF_COMPRESS_MAX_BYTES = 50 * 1024 * 1024;

export interface ChatForwardMessageRequest {
  messageId: string;
  recipientIds: string[];
}

export interface ChatForwardMessageRequestPayload {
  messageId?: string;
  recipientIds?: string[];
}

export interface ChatForwardMessageResponse {
  failedRecipientIds: string[];
  forwardedRecipientIds: string[];
}

export interface ChatSharedLinkCreateRequest {
  messageId?: string;
  storagePath?: string;
}

export interface ChatSharedLinkCreateRequestPayload {
  messageId?: string;
  storagePath?: string;
}

export interface ChatSharedLinkResponse {
  slug: string;
  shortUrl: string;
  storagePath?: string | null;
}
