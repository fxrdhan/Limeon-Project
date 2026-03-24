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
