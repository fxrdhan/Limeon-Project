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

  const closeImagePreview = useCallback(() => {
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

  const openImageInPortal = useCallback(
    async (message: PreviewableMessage, previewName: string) => {
      const requestId = activeImagePreviewRequestIdRef.current + 1;
      activeImagePreviewRequestIdRef.current = requestId;

      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
      releaseImagePreviewObjectUrl();

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
    [releaseImagePreviewObjectUrl]
  );

  const openDocumentInPortal = useCallback(
    async (
      message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
      previewName: string,
      forcePdfMime = false
    ) => {
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
    [openDocumentPreview]
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
    documentPreviewUrl,
    documentPreviewName,
    isDocumentPreviewVisible,
    closeDocumentPreview,
    imagePreviewUrl,
    imagePreviewName,
    isImagePreviewVisible,
    closeImagePreview,
    openImageInPortal,
    openDocumentInPortal,
  };
};
