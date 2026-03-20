import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';
import {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from '../utils/message-file';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';

type PreviewableMessage = Pick<
  ChatMessage,
  'message' | 'file_storage_path' | 'file_mime_type'
>;

type PreviewableImageGroupMessage = Pick<
  ChatMessage,
  'id' | 'message' | 'file_storage_path' | 'file_mime_type' | 'file_name'
>;

type ResolvedImageGroupPreviewItem = {
  id: string;
  previewUrl: string;
  previewName: string;
  revokeOnClose: boolean;
};

const getImagePreviewName = (
  message: PreviewableImageGroupMessage,
  fallbackIndex: number
) => {
  const explicitName = message.file_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const pathName = message.message.split('/').pop()?.split('?')[0]?.trim();
  if (pathName) {
    return pathName;
  }

  return `Gambar ${fallbackIndex + 1}`;
};

export const useMessagesPanePreviews = () => {
  const {
    previewUrl: documentPreviewUrl,
    previewName: documentPreviewName,
    isPreviewVisible: isDocumentPreviewVisible,
    closeDocumentPreview,
    openDocumentPreview,
  } = useDocumentPreviewPortal();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewName, setImagePreviewName] = useState('');
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [imageGroupPreviewItems, setImageGroupPreviewItems] = useState<
    Array<{
      id: string;
      previewUrl: string;
      previewName: string;
    }>
  >([]);
  const [activeImageGroupPreviewId, setActiveImageGroupPreviewId] = useState<
    string | null
  >(null);
  const [isImageGroupPreviewVisible, setIsImageGroupPreviewVisible] =
    useState(false);
  const imagePreviewCloseTimerRef = useRef<number | null>(null);
  const imageGroupPreviewCloseTimerRef = useRef<number | null>(null);
  const imagePreviewObjectUrlRef = useRef<string | null>(null);
  const imageGroupPreviewObjectUrlsRef = useRef<string[]>([]);
  const activeImagePreviewRequestIdRef = useRef(0);
  const activeImageGroupPreviewRequestIdRef = useRef(0);

  const releaseImagePreviewObjectUrl = useCallback(() => {
    if (!imagePreviewObjectUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(imagePreviewObjectUrlRef.current);
    imagePreviewObjectUrlRef.current = null;
  }, []);

  const releaseImageGroupPreviewObjectUrls = useCallback(() => {
    if (imageGroupPreviewObjectUrlsRef.current.length === 0) {
      return;
    }

    imageGroupPreviewObjectUrlsRef.current.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    imageGroupPreviewObjectUrlsRef.current = [];
  }, []);

  const clearImagePreviewStateImmediately = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    setIsImagePreviewVisible(false);
    setImagePreviewUrl(null);
    setImagePreviewName('');
    releaseImagePreviewObjectUrl();
  }, [releaseImagePreviewObjectUrl]);

  const clearImageGroupPreviewStateImmediately = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    setIsImageGroupPreviewVisible(false);
    setImageGroupPreviewItems([]);
    setActiveImageGroupPreviewId(null);
    releaseImageGroupPreviewObjectUrls();
  }, [releaseImageGroupPreviewObjectUrls]);

  const resolveImagePreviewResource = useCallback(
    async (message: PreviewableMessage) => {
      let nextPreviewUrl: string | null = null;
      let revokeOnClose = false;

      try {
        const signedUrl = await resolveChatAssetUrl(
          message.message,
          message.file_storage_path
        );
        if (signedUrl) {
          nextPreviewUrl = signedUrl;
        } else {
          const imageBlob = await fetchChatFileBlobWithFallback(
            message.message,
            message.file_storage_path,
            message.file_mime_type
          );

          if (imageBlob) {
            nextPreviewUrl = URL.createObjectURL(imageBlob);
            revokeOnClose = true;
          }
        }
      } catch {
        nextPreviewUrl = null;
        revokeOnClose = false;
      }

      if (!nextPreviewUrl && isDirectChatAssetUrl(message.message)) {
        nextPreviewUrl = message.message;
      }

      return {
        previewUrl: nextPreviewUrl,
        revokeOnClose,
      };
    },
    []
  );

  const closeImagePreview = useCallback(() => {
    activeImagePreviewRequestIdRef.current += 1;
    setIsImagePreviewVisible(false);
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    imagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setImagePreviewUrl(null);
      setImagePreviewName('');
      releaseImagePreviewObjectUrl();
      imagePreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseImagePreviewObjectUrl]);

  const closeImageGroupPreview = useCallback(() => {
    activeImageGroupPreviewRequestIdRef.current += 1;
    setIsImageGroupPreviewVisible(false);
    if (imageGroupPreviewCloseTimerRef.current) {
      window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
      imageGroupPreviewCloseTimerRef.current = null;
    }
    imageGroupPreviewCloseTimerRef.current = window.setTimeout(() => {
      setImageGroupPreviewItems([]);
      setActiveImageGroupPreviewId(null);
      releaseImageGroupPreviewObjectUrls();
      imageGroupPreviewCloseTimerRef.current = null;
    }, 150);
  }, [releaseImageGroupPreviewObjectUrls]);

  const openImageInPortal = useCallback(
    async (message: PreviewableMessage, previewName: string) => {
      clearImageGroupPreviewStateImmediately();

      const requestId = activeImagePreviewRequestIdRef.current + 1;
      activeImagePreviewRequestIdRef.current = requestId;

      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();

      const { previewUrl: nextPreviewUrl, revokeOnClose } =
        await resolveImagePreviewResource(message);

      if (!nextPreviewUrl) {
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

      imagePreviewObjectUrlRef.current = revokeOnClose ? nextPreviewUrl : null;
      setImagePreviewUrl(nextPreviewUrl);
      setImagePreviewName(previewName);
      requestAnimationFrame(() => {
        if (activeImagePreviewRequestIdRef.current === requestId) {
          setIsImagePreviewVisible(true);
        }
      });
    },
    [
      clearImageGroupPreviewStateImmediately,
      releaseImagePreviewObjectUrl,
      resolveImagePreviewResource,
    ]
  );

  const openImageGroupInPortal = useCallback(
    async (
      messages: PreviewableImageGroupMessage[],
      initialMessageId?: string | null
    ) => {
      if (messages.length === 0) {
        return;
      }

      clearImagePreviewStateImmediately();

      const requestId = activeImageGroupPreviewRequestIdRef.current + 1;
      activeImageGroupPreviewRequestIdRef.current = requestId;

      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImageGroupPreviewObjectUrls();

      const resolvedPreviewCandidates = await Promise.all(
        messages.map(async (message, index) => {
          const { previewUrl, revokeOnClose } =
            await resolveImagePreviewResource(message);

          if (!previewUrl) {
            return null;
          }

          return {
            id: message.id,
            previewUrl,
            previewName: getImagePreviewName(message, index),
            revokeOnClose,
          } satisfies ResolvedImageGroupPreviewItem;
        })
      );
      const resolvedPreviewItems = resolvedPreviewCandidates.filter(
        (previewItem): previewItem is ResolvedImageGroupPreviewItem =>
          previewItem !== null
      );

      if (resolvedPreviewItems.length === 0) {
        toast.error('Preview gambar tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

      if (activeImageGroupPreviewRequestIdRef.current !== requestId) {
        resolvedPreviewItems.forEach(previewItem => {
          if (previewItem.revokeOnClose) {
            URL.revokeObjectURL(previewItem.previewUrl);
          }
        });
        return;
      }

      imageGroupPreviewObjectUrlsRef.current = resolvedPreviewItems
        .filter(previewItem => previewItem.revokeOnClose)
        .map(previewItem => previewItem.previewUrl);
      setImageGroupPreviewItems(
        resolvedPreviewItems.map(({ id, previewName, previewUrl }) => ({
          id,
          previewName,
          previewUrl,
        }))
      );
      setActiveImageGroupPreviewId(
        initialMessageId &&
          resolvedPreviewItems.some(
            previewItem => previewItem.id === initialMessageId
          )
          ? initialMessageId
          : resolvedPreviewItems[0]?.id || null
      );
      requestAnimationFrame(() => {
        if (activeImageGroupPreviewRequestIdRef.current === requestId) {
          setIsImageGroupPreviewVisible(true);
        }
      });
    },
    [
      clearImagePreviewStateImmediately,
      releaseImageGroupPreviewObjectUrls,
      resolveImagePreviewResource,
    ]
  );

  const openDocumentInPortal = useCallback(
    async (
      message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
      previewName: string,
      forcePdfMime = false
    ) => {
      clearImagePreviewStateImmediately();
      clearImageGroupPreviewStateImmediately();

      try {
        await openDocumentPreview({
          previewName,
          resolvePreviewUrl: async () => {
            if (!forcePdfMime && isDirectChatAssetUrl(message.message)) {
              return {
                previewUrl: message.message,
                revokeOnClose: false,
              };
            }

            const resolvedAssetUrl = await resolveChatAssetUrl(
              message.message,
              message.file_storage_path
            );
            if (resolvedAssetUrl) {
              return {
                previewUrl: resolvedAssetUrl,
                revokeOnClose: false,
              };
            }

            if (!forcePdfMime) {
              try {
                const fileBlob = await fetchChatFileBlobWithFallback(
                  message.message,
                  message.file_storage_path
                );
                if (fileBlob) {
                  return {
                    previewUrl: URL.createObjectURL(fileBlob),
                    revokeOnClose: true,
                  };
                }
              } catch {
                // Fall back to PDF/blob checks below.
              }
            }

            try {
              const pdfBlob = await fetchPdfBlobWithFallback(
                message.message,
                message.file_storage_path
              );
              if (pdfBlob) {
                return {
                  previewUrl: URL.createObjectURL(pdfBlob),
                  revokeOnClose: true,
                };
              }
            } catch {
              // Fall back to a direct URL only when the payload is already usable.
            }

            if (isDirectChatAssetUrl(message.message)) {
              return {
                previewUrl: message.message,
                revokeOnClose: false,
              };
            }

            throw new Error('Document preview is unavailable');
          },
        });
      } catch {
        toast.error('Preview dokumen tidak tersedia', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      }
    },
    [
      clearImageGroupPreviewStateImmediately,
      clearImagePreviewStateImmediately,
      openDocumentPreview,
    ]
  );

  useEffect(() => {
    return () => {
      activeImagePreviewRequestIdRef.current += 1;
      activeImageGroupPreviewRequestIdRef.current += 1;
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      if (imageGroupPreviewCloseTimerRef.current) {
        window.clearTimeout(imageGroupPreviewCloseTimerRef.current);
        imageGroupPreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();
      releaseImageGroupPreviewObjectUrls();
    };
  }, [releaseImageGroupPreviewObjectUrls, releaseImagePreviewObjectUrl]);

  return {
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    imagePreviewUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    imageGroupPreviewItems,
    activeImageGroupPreviewId,
    isImageGroupPreviewVisible,
    closeImageGroupPreview,
    selectImageGroupPreviewItem: setActiveImageGroupPreviewId,
    openImageInPortal,
    openImageGroupInPortal,
    openDocumentInPortal,
  };
};
