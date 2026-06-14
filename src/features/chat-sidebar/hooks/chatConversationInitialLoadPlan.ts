import {
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  CHAT_CONVERSATION_PAGE_SIZE,
} from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { isCacheableChannelImageMessage } from '../utils/channel-image-asset-cache';

export const INITIAL_IMAGE_PREVIEW_PRIME_LIMIT = 12;
export const INITIAL_CACHED_IMAGE_ASSET_PRIME_LIMIT = 8;
export const INITIAL_CACHED_IMAGE_ASSET_PRIME_TIMEOUT_MS = 80;

export const getInitialConversationRefreshPageSize = (
  cachedMessagesLength: number
) =>
  Math.min(
    Math.max(CHAT_CONVERSATION_PAGE_SIZE, cachedMessagesLength),
    CHAT_CONVERSATION_CACHE_MAX_MESSAGES
  );

export const getRecentPreviewableImageMessages = (
  messages: ChatMessage[],
  limit = INITIAL_IMAGE_PREVIEW_PRIME_LIMIT
) =>
  [...messages]
    .reverse()
    .filter(
      messageItem =>
        isCacheableChannelImageMessage(messageItem) &&
        Boolean(messageItem.file_preview_url?.trim())
    )
    .slice(0, limit);

export const getRecentCacheableImageMessages = (
  messages: ChatMessage[],
  limit = INITIAL_CACHED_IMAGE_ASSET_PRIME_LIMIT
) =>
  [...messages]
    .reverse()
    .filter(messageItem => isCacheableChannelImageMessage(messageItem))
    .slice(0, limit);

export const getUndeliveredIncomingMessageIds = ({
  messages,
  userId,
  targetUserId,
}: {
  messages: ChatMessage[];
  userId: string;
  targetUserId: string;
}) =>
  messages
    .filter(
      messageItem =>
        messageItem.sender_id === targetUserId &&
        messageItem.receiver_id === userId &&
        !messageItem.is_delivered
    )
    .map(messageItem => messageItem.id);
