import { useCallback, useEffect, useRef, useState } from 'react';
import { useDocumentPreviewPortal } from './useDocumentPreviewPortal';
import { fetchPdfBlobWithFallback } from '../utils/message-file';

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

  const closeImagePreview = useCallback(() => {
    setIsImagePreviewVisible(false);
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    imagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setImagePreviewUrl(null);
      setImagePreviewName('');
      imagePreviewCloseTimerRef.current = null;
    }, 150);
  }, []);

  const openImageInPortal = useCallback((url: string, previewName: string) => {
    if (imagePreviewCloseTimerRef.current) {
      window.clearTimeout(imagePreviewCloseTimerRef.current);
      imagePreviewCloseTimerRef.current = null;
    }
    setImagePreviewUrl(url);
    setImagePreviewName(previewName);
    requestAnimationFrame(() => {
      setIsImagePreviewVisible(true);
    });
  }, []);

  const openDocumentInPortal = useCallback(
    async (url: string, previewName: string, forcePdfMime = false) => {
      await openDocumentPreview({
        previewName,
        resolvePreviewUrl: async () => {
          if (!forcePdfMime) {
            return {
              previewUrl: url,
              revokeOnClose: false,
            };
          }

          try {
            const pdfBlob = await fetchPdfBlobWithFallback(url);
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
            previewUrl: url,
            revokeOnClose: false,
          };
        },
      });
    },
    [openDocumentPreview]
  );

  useEffect(() => {
    return () => {
      if (imagePreviewCloseTimerRef.current) {
        window.clearTimeout(imagePreviewCloseTimerRef.current);
        imagePreviewCloseTimerRef.current = null;
      }
    };
  }, []);

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
