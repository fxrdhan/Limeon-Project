import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';
import {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
} from '../utils/message-file';
import type { ChatMessage } from '../data/chatSidebarGateway';

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

      let nextPreviewUrl = message.message;
      let revokeOnClose = false;

      try {
        const imageBlob = await fetchChatFileBlobWithFallback(
          message.message,
          message.file_storage_path,
          message.file_mime_type
        );

        if (imageBlob) {
          nextPreviewUrl = URL.createObjectURL(imageBlob);
          revokeOnClose = true;
        }
      } catch {
        nextPreviewUrl = message.message;
        revokeOnClose = false;
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
      await openDocumentPreview({
        previewName,
        resolvePreviewUrl: async () => {
          if (!forcePdfMime) {
            return {
              previewUrl: message.message,
              revokeOnClose: false,
            };
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
            // Fall back to direct URL below.
          }

          return {
            previewUrl: message.message,
            revokeOnClose: false,
          };
        },
      });
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
