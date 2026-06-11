import { useCallback } from 'react';
import {
  resolveImagePreviewResource as resolveChatImagePreviewResource,
  type PreviewableImageGroupMessage,
  type PreviewableMessage,
} from '../utils/message-preview-assets';
import { useImageGroupPreview } from './messages-pane-image-previews/useImageGroupPreview';
import { useSingleImagePreview } from './messages-pane-image-previews/useSingleImagePreview';
import type { ImagePreviewIntrinsicDimensions } from './messages-pane-image-previews/types';

export const useMessagesPaneImagePreviews = ({
  currentChannelId,
}: {
  currentChannelId: string | null;
}) => {
  const resolveImagePreviewResource = useCallback(
    async (message: PreviewableMessage) =>
      await resolveChatImagePreviewResource({
        currentChannelId,
        message,
      }),
    [currentChannelId]
  );
  const singleImagePreview = useSingleImagePreview({
    currentChannelId,
    resolveImagePreviewResource,
  });
  const imageGroupPreview = useImageGroupPreview({
    currentChannelId,
    resolveImagePreviewResource,
  });
  const {
    isImagePreviewOpen,
    imagePreviewUrl,
    imagePreviewBackdropUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal: openSingleImageInPortal,
    clearImagePreviewStateImmediately,
  } = singleImagePreview;
  const {
    imageGroupPreviewItems,
    activeImageGroupPreviewId,
    isImageGroupPreviewVisible,
    closeImageGroupPreview,
    selectImageGroupPreviewItem,
    openImageGroupInPortal: openImageGroupInPortalBase,
    clearImageGroupPreviewStateImmediately,
  } = imageGroupPreview;

  const openImageInPortal = useCallback(
    async (
      message: PreviewableMessage,
      previewName: string,
      initialPreviewUrl?: string | null
    ) => {
      clearImageGroupPreviewStateImmediately();
      await openSingleImageInPortal(message, previewName, initialPreviewUrl);
    },
    [clearImageGroupPreviewStateImmediately, openSingleImageInPortal]
  );

  const openImageGroupInPortal = useCallback(
    async (
      messages: PreviewableImageGroupMessage[],
      initialMessageId?: string | null,
      initialPreviewUrl?: string | null,
      initialPreviewIntrinsicDimensions?: ImagePreviewIntrinsicDimensions | null
    ) => {
      clearImagePreviewStateImmediately();
      await openImageGroupInPortalBase(
        messages,
        initialMessageId,
        initialPreviewUrl,
        initialPreviewIntrinsicDimensions
      );
    },
    [clearImagePreviewStateImmediately, openImageGroupInPortalBase]
  );

  return {
    isImagePreviewOpen,
    imagePreviewUrl,
    imagePreviewBackdropUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    imageGroupPreviewItems,
    activeImageGroupPreviewId,
    isImageGroupPreviewVisible,
    closeImageGroupPreview,
    selectImageGroupPreviewItem,
    openImageInPortal,
    openImageGroupInPortal,
    clearImagePreviewStateImmediately,
    clearImageGroupPreviewStateImmediately,
  };
};
