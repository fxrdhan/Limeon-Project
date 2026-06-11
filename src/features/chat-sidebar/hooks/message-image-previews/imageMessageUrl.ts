import type { ChatMessage } from '../../data/chatSidebarGateway';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  getCachedResolvedChatAssetUrl,
  getFreshResolvedChatAssetUrl,
  isDirectChatAssetUrl,
  type ResolvedChatAssetUrlEntry,
} from '../../utils/message-file';

interface ResolveImageMessageUrlProps {
  currentChannelId: string | null;
  message: Pick<
    ChatMessage,
    | 'id'
    | 'message'
    | 'message_type'
    | 'file_name'
    | 'file_mime_type'
    | 'file_preview_url'
  >;
  resolvedFullAssetUrlsByMessageId: Record<string, string>;
  resolvedPreviewAssetEntriesByMessageId: Record<
    string,
    ResolvedChatAssetUrlEntry
  >;
}

export const resolveImageMessageUrl = ({
  currentChannelId,
  message,
  resolvedFullAssetUrlsByMessageId,
  resolvedPreviewAssetEntriesByMessageId,
}: ResolveImageMessageUrlProps) => {
  if (!chatRuntime.imageAssets.isPreviewableMessage(message)) {
    return null;
  }

  const normalizedChannelId = currentChannelId?.trim() || null;
  const runtimeFullUrl =
    normalizedChannelId &&
    chatRuntime.imageAssets.getUrl(normalizedChannelId, message.id, 'full');
  if (runtimeFullUrl) {
    return runtimeFullUrl;
  }

  const resolvedFullAssetUrl = resolvedFullAssetUrlsByMessageId[message.id];
  if (resolvedFullAssetUrl) {
    return resolvedFullAssetUrl;
  }

  const runtimeThumbnailUrl =
    normalizedChannelId &&
    chatRuntime.imageAssets.getUrl(
      normalizedChannelId,
      message.id,
      'thumbnail'
    );
  if (runtimeThumbnailUrl) {
    return runtimeThumbnailUrl;
  }

  const resolvedPreviewAssetUrl = getFreshResolvedChatAssetUrl(
    resolvedPreviewAssetEntriesByMessageId[message.id]
  );
  if (resolvedPreviewAssetUrl) {
    return resolvedPreviewAssetUrl;
  }

  const persistedPreviewUrl = message.file_preview_url?.trim() || null;
  const cachedResolvedPreviewUrl = persistedPreviewUrl
    ? getCachedResolvedChatAssetUrl(persistedPreviewUrl, persistedPreviewUrl)
    : null;
  if (cachedResolvedPreviewUrl) {
    return cachedResolvedPreviewUrl;
  }

  if (persistedPreviewUrl && isDirectChatAssetUrl(persistedPreviewUrl)) {
    return persistedPreviewUrl;
  }

  if (message.id.startsWith('temp_') || isDirectChatAssetUrl(message.message)) {
    return message.message;
  }

  return null;
};
