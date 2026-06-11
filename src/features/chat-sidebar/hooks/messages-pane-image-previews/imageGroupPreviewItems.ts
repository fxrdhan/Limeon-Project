import { chatRuntime } from '../../utils/chatRuntime';
import {
  getChatImagePreviewName,
  resolveInitialImagePreviewUrl,
  resolveInitialImageThumbnailUrl,
  type PreviewableImageGroupMessage,
} from '../../utils/message-preview-assets';
import type { ImageGroupPreviewItem } from './types';

export const getInitialImageGroupPreviewId = (
  messages: PreviewableImageGroupMessage[],
  initialMessageId?: string | null
) =>
  initialMessageId && messages.some(message => message.id === initialMessageId)
    ? initialMessageId
    : messages[0]?.id || null;

export const getInitialImageGroupPreviewMessage = (
  messages: PreviewableImageGroupMessage[],
  activePreviewId: string | null
) =>
  (activePreviewId
    ? messages.find(message => message.id === activePreviewId)
    : null) || null;

export const buildInitialImageGroupPreviewItems = ({
  activePreviewId,
  currentChannelId,
  initialPreviewUrl,
  messages,
  seededActivePreviewUrl,
}: {
  activePreviewId: string | null;
  currentChannelId: string | null;
  initialPreviewUrl?: string | null;
  messages: PreviewableImageGroupMessage[];
  seededActivePreviewUrl: string | null;
}): ImageGroupPreviewItem[] => {
  const normalizedChannelId = currentChannelId?.trim() || null;

  return messages.map((message, index) => {
    const preferredPreviewUrl =
      message.id === activePreviewId
        ? seededActivePreviewUrl ||
          initialPreviewUrl ||
          message.previewUrl ||
          null
        : message.previewUrl || null;
    const runtimeFullPreviewUrl = normalizedChannelId
      ? chatRuntime.imageAssets.getUrl(normalizedChannelId, message.id, 'full')
      : null;

    return {
      id: message.id,
      thumbnailUrl: resolveInitialImageThumbnailUrl(message, currentChannelId),
      previewUrl: resolveInitialImagePreviewUrl(
        message,
        currentChannelId,
        preferredPreviewUrl
      ),
      fullPreviewUrl:
        runtimeFullPreviewUrl ||
        (message.id === activePreviewId
          ? seededActivePreviewUrl || null
          : null),
      previewName: getChatImagePreviewName(message, index),
    };
  });
};

export const getPrioritizedImageGroupPreviewMessageIds = (
  messages: PreviewableImageGroupMessage[],
  activePreviewId: string | null
) => [
  ...(activePreviewId ? [activePreviewId] : []),
  ...messages
    .map(message => message.id)
    .filter(messageId => messageId !== activePreviewId),
];
