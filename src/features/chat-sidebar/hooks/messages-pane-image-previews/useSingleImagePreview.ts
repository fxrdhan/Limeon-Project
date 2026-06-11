import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../../constants';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  resolveInitialImagePreviewUrl,
  type PreviewableMessage,
} from '../../utils/message-preview-assets';
import type { ImagePreviewState, ResolveImagePreviewResource } from './types';

export const useSingleImagePreview = ({
  currentChannelId,
  resolveImagePreviewResource,
}: {
  currentChannelId: string | null;
  resolveImagePreviewResource: ResolveImagePreviewResource;
}) => {
  const [imagePreviewState, setImagePreviewState] = useState<ImagePreviewState>(
    {
      backdropUrl: null,
      fullUrl: null,
      previewName: '',
    }
  );
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const imagePreviewCloseTimerRef = useRef<number | null>(null);
  const imagePreviewObjectUrlRef = useRef<string | null>(null);
  const activeImagePreviewRequestIdRef = useRef(0);

  const releaseImagePreviewObjectUrl = useCallback(() => {
    if (!imagePreviewObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(imagePreviewObjectUrlRef.current);
    imagePreviewObjectUrlRef.current = null;
  }, []);

  const clearImagePreviewStateImmediately = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    setIsImagePreviewVisible(false);
    setIsImagePreviewOpen(false);
    setImagePreviewState({
      backdropUrl: null,
      fullUrl: null,
      previewName: '',
    });
    releaseImagePreviewObjectUrl();
  }, [releaseImagePreviewObjectUrl]);

  const closeImagePreview = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    setIsImagePreviewVisible(false);
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    imagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsImagePreviewOpen(false);
      setImagePreviewState({
        backdropUrl: null,
        fullUrl: null,
        previewName: '',
      });
      releaseImagePreviewObjectUrl();
      imagePreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseImagePreviewObjectUrl]);

  const openImageInPortal = useCallback(
    async (
      message: PreviewableMessage,
      previewName: string,
      initialPreviewUrl?: string | null
    ) => {
      const requestId = activeImagePreviewRequestIdRef.current + 1;
      activeImagePreviewRequestIdRef.current = requestId;

      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();
      const normalizedChannelId = currentChannelId?.trim() || null;
      const runtimeFullPreviewUrl = normalizedChannelId
        ? chatRuntime.imageAssets.getUrl(
            normalizedChannelId,
            message.id,
            'full'
          )
        : null;
      const seededPreviewUrl = resolveInitialImagePreviewUrl(
        message,
        currentChannelId,
        initialPreviewUrl
      );
      let resolvedPreviewBeforeOpen = seededPreviewUrl;
      let resolvedPreviewBeforeOpenRequiresCleanup = false;

      if (!resolvedPreviewBeforeOpen) {
        const { previewUrl, revokeOnClose } =
          await resolveImagePreviewResource(message);

        if (!previewUrl) {
          toast.error('Preview gambar tidak tersedia', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return;
        }

        resolvedPreviewBeforeOpen = previewUrl;
        resolvedPreviewBeforeOpenRequiresCleanup = revokeOnClose;
      }

      setIsImagePreviewOpen(true);
      setImagePreviewState({
        backdropUrl: resolvedPreviewBeforeOpen,
        fullUrl: runtimeFullPreviewUrl || resolvedPreviewBeforeOpen,
        previewName,
      });
      imagePreviewObjectUrlRef.current =
        resolvedPreviewBeforeOpenRequiresCleanup
          ? resolvedPreviewBeforeOpen
          : null;
      requestAnimationFrame(() => {
        if (activeImagePreviewRequestIdRef.current === requestId) {
          setIsImagePreviewVisible(true);
        }
      });

      if (
        runtimeFullPreviewUrl ||
        resolvedPreviewBeforeOpen === seededPreviewUrl
      ) {
        return;
      }

      const nextPreviewUrl = resolvedPreviewBeforeOpen;
      const revokeOnClose = resolvedPreviewBeforeOpenRequiresCleanup;

      if (!nextPreviewUrl) {
        clearImagePreviewStateImmediately();
        toast.error('Preview gambar tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      if (activeImagePreviewRequestIdRef.current !== requestId) {
        if (revokeOnClose) {
          URL.revokeObjectURL(nextPreviewUrl);
        }
        return;
      }

      setImagePreviewState(previousState => ({
        backdropUrl: previousState.backdropUrl || nextPreviewUrl,
        fullUrl: nextPreviewUrl,
        previewName,
      }));
    },
    [
      clearImagePreviewStateImmediately,
      currentChannelId,
      releaseImagePreviewObjectUrl,
      resolveImagePreviewResource,
    ]
  );

  useEffect(() => {
    return () => {
      activeImagePreviewRequestIdRef.current += 1;
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();
    };
  }, [releaseImagePreviewObjectUrl]);

  return {
    isImagePreviewOpen,
    imagePreviewUrl: imagePreviewState.fullUrl,
    imagePreviewBackdropUrl: imagePreviewState.backdropUrl,
    imagePreviewName: imagePreviewState.previewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal,
    clearImagePreviewStateImmediately,
  };
};
