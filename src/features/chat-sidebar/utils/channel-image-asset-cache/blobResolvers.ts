import type { ChatMessage } from '../../data/chatSidebarGateway';
import { createImagePreviewBlob } from '../image-message-preview';
import {
  fetchChatFileBlobWithFallback,
  isImageFileExtensionOrMime,
  resolveFileExtension,
} from '../message-file';
import type { CacheableImageMessage } from './types';

export const resolveFullChannelImageAssetBlob = async (
  message: CacheableImageMessage
) =>
  fetchChatFileBlobWithFallback(
    message.message,
    message.file_storage_path,
    message.file_mime_type
  );

export const resolveThumbnailChannelImageAssetBlob = async (
  message: CacheableImageMessage
) => {
  const persistedPreviewPath = message.file_preview_url?.trim() || null;
  if (persistedPreviewPath) {
    const previewBlob = await fetchChatFileBlobWithFallback(
      persistedPreviewPath,
      persistedPreviewPath
    );
    if (previewBlob) {
      return previewBlob;
    }
  }

  const fullBlob = await resolveFullChannelImageAssetBlob(message);
  if (!fullBlob) {
    return null;
  }

  return (await createImagePreviewBlob(fullBlob)) || fullBlob;
};

export const isCacheableChannelImageMessage = (
  message: Pick<
    ChatMessage,
    | 'message_type'
    | 'message'
    | 'file_name'
    | 'file_mime_type'
    | 'file_preview_url'
  >
) => {
  if (message.message_type === 'image') {
    return true;
  }

  if (message.message_type !== 'file') {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name ?? null,
    message.message,
    message.file_mime_type
  );

  return isImageFileExtensionOrMime(fileExtension, message.file_mime_type);
};
