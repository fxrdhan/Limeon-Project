import type { ChatMessage } from '../data/chatSidebarGateway';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPdfBlobWithFallback,
  isDirectChatAssetUrl,
  resolveFileExtension,
} from '../utils/message-file';
import {
  getCachedPdfMessagePreview,
  pruneCachedPdfMessagePreviews,
  setCachedPdfMessagePreview,
  type PdfMessagePreviewCacheEntry,
} from '../utils/pdf-message-preview-cache';
import { renderPdfPreviewDataUrl } from '../utils/pdf-preview';

export type PdfMessagePreview = PdfMessagePreviewCacheEntry;
const PDF_PREVIEW_MAX_RETRY_ATTEMPTS = 3;
const PDF_PREVIEW_RETRY_BASE_DELAY_MS = 900;

const buildPdfMessagePreviewCacheKey = (
  message: ChatMessage,
  fileName: string | null
) => {
  const statusPart = message.file_preview_status || '';
  const previewUrlPart = message.file_preview_url || '';
  const pageCountPart =
    typeof message.file_preview_page_count === 'number'
      ? String(message.file_preview_page_count)
      : '';

  return [
    message.id,
    message.message,
    statusPart,
    previewUrlPart,
    pageCountPart,
    message.file_storage_path || '',
    fileName,
    message.file_size ?? '',
    message.file_mime_type ?? '',
  ].join('::');
};

interface UseMessagePdfPreviewsProps {
  messages: ChatMessage[];
  getAttachmentFileName: (message: ChatMessage) => string;
  getAttachmentFileKind: (message: ChatMessage) => 'audio' | 'document';
}

export const useMessagePdfPreviews = ({
  messages,
  getAttachmentFileName,
  getAttachmentFileKind,
}: UseMessagePdfPreviewsProps) => {
  const [pdfMessagePreviews, setPdfMessagePreviews] = useState<
    Record<string, PdfMessagePreview>
  >({});
  const [, setPdfPreviewRetryNonce] = useState(0);
  const pdfPreviewRenderingIdsRef = useRef<Set<string>>(new Set());
  const pdfPreviewRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  const pdfPreviewRetryTimersRef = useRef<Map<string, number>>(new Map());

  const clearPdfPreviewRetryTimer = useCallback((messageId: string) => {
    const existingTimerId = pdfPreviewRetryTimersRef.current.get(messageId);
    if (!existingTimerId) return;
    window.clearTimeout(existingTimerId);
    pdfPreviewRetryTimersRef.current.delete(messageId);
  }, []);

  const schedulePdfPreviewRetry = useCallback(
    (messageId: string) => {
      if (pdfPreviewRetryTimersRef.current.has(messageId)) return;

      const nextAttemptCount =
        (pdfPreviewRetryAttemptsRef.current.get(messageId) ?? 0) + 1;
      pdfPreviewRetryAttemptsRef.current.set(messageId, nextAttemptCount);

      if (nextAttemptCount >= PDF_PREVIEW_MAX_RETRY_ATTEMPTS) return;

      const retryDelay = PDF_PREVIEW_RETRY_BASE_DELAY_MS * nextAttemptCount;
      const retryTimerId = window.setTimeout(() => {
        pdfPreviewRetryTimersRef.current.delete(messageId);
        setPdfPreviewRetryNonce(previousValue => previousValue + 1);
      }, retryDelay);
      pdfPreviewRetryTimersRef.current.set(messageId, retryTimerId);
    },
    [pdfPreviewRetryAttemptsRef, pdfPreviewRetryTimersRef]
  );

  useEffect(() => {
    const pdfPreviewRetryTimers = pdfPreviewRetryTimersRef.current;

    return () => {
      pdfPreviewRetryTimers.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      pdfPreviewRetryTimers.clear();
    };
  }, [pdfPreviewRetryTimersRef]);

  useEffect(() => {
    setPdfMessagePreviews(previousPreviews => {
      let hasChanges = false;
      const nextPreviews: Record<string, PdfMessagePreview> = {};

      for (const message of messages) {
        if (message.message_type !== 'file') continue;
        if (getAttachmentFileKind(message) !== 'document') continue;

        const fileName = getAttachmentFileName(message);
        const extension = resolveFileExtension(
          fileName,
          message.message,
          message.file_mime_type
        );
        const isPdf =
          extension === 'pdf' ||
          message.file_mime_type?.toLowerCase().includes('pdf') === true;
        if (!isPdf) continue;

        const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
        const existingPreview = previousPreviews[message.id];

        if (existingPreview?.cacheKey === cacheKey) {
          nextPreviews[message.id] = existingPreview;
          continue;
        }

        const cachedPreview = getCachedPdfMessagePreview(cacheKey);
        if (cachedPreview) {
          nextPreviews[message.id] = cachedPreview;
          hasChanges = true;
          continue;
        }

        if (existingPreview) {
          hasChanges = true;
        }
      }

      if (
        Object.keys(nextPreviews).length !==
        Object.keys(previousPreviews).length
      ) {
        hasChanges = true;
      }

      return hasChanges ? nextPreviews : previousPreviews;
    });
  }, [getAttachmentFileKind, getAttachmentFileName, messages]);

  useEffect(() => {
    const activePdfMessageIds = new Set<string>();

    for (const message of messages) {
      if (message.message_type !== 'file') continue;
      if (getAttachmentFileKind(message) !== 'document') continue;

      const fileName = getAttachmentFileName(message);
      const extension = resolveFileExtension(
        fileName,
        message.message,
        message.file_mime_type
      );
      const isPdf =
        extension === 'pdf' ||
        message.file_mime_type?.toLowerCase().includes('pdf') === true;
      if (!isPdf) continue;

      activePdfMessageIds.add(message.id);
    }

    for (const [messageId] of pdfPreviewRetryAttemptsRef.current) {
      if (activePdfMessageIds.has(messageId)) continue;
      pdfPreviewRetryAttemptsRef.current.delete(messageId);
      clearPdfPreviewRetryTimer(messageId);
      pdfPreviewRenderingIdsRef.current.delete(messageId);
    }

    pruneCachedPdfMessagePreviews(activePdfMessageIds);
  }, [
    clearPdfPreviewRetryTimer,
    getAttachmentFileKind,
    getAttachmentFileName,
    messages,
    pdfPreviewRetryAttemptsRef,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const pendingPdfMessages = messages.filter(message => {
      if (message.message_type !== 'file') return false;
      if (getAttachmentFileKind(message) !== 'document') return false;

      const fileName = getAttachmentFileName(message);
      const extension = resolveFileExtension(
        fileName,
        message.message,
        message.file_mime_type
      );
      const isPdf =
        extension === 'pdf' ||
        message.file_mime_type?.toLowerCase().includes('pdf') === true;
      if (!isPdf) return false;

      const hasPersistedPreviewUrl =
        typeof message.file_preview_url === 'string' &&
        message.file_preview_url.trim().length > 0 &&
        isDirectChatAssetUrl(message.file_preview_url);
      if (hasPersistedPreviewUrl) return false;

      const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
      if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) return false;
      if (getCachedPdfMessagePreview(cacheKey)) return false;
      if (pdfPreviewRenderingIdsRef.current.has(message.id)) return false;
      if (pdfPreviewRetryTimersRef.current.has(message.id)) return false;
      if (
        (pdfPreviewRetryAttemptsRef.current.get(message.id) ?? 0) >=
        PDF_PREVIEW_MAX_RETRY_ATTEMPTS
      ) {
        return false;
      }

      return true;
    });

    if (pendingPdfMessages.length === 0) return;

    const renderPdfPreviews = async () => {
      try {
        for (const pendingMessage of pendingPdfMessages) {
          if (isCancelled) return;
          pdfPreviewRenderingIdsRef.current.add(pendingMessage.id);

          const pendingFileName = getAttachmentFileName(pendingMessage);
          const cacheKey = buildPdfMessagePreviewCacheKey(
            pendingMessage,
            pendingFileName
          );

          try {
            const pdfBlob = await fetchPdfBlobWithFallback(
              pendingMessage.message,
              pendingMessage.file_storage_path
            );
            if (!pdfBlob) {
              schedulePdfPreviewRetry(pendingMessage.id);
              continue;
            }

            const renderedPreview = await renderPdfPreviewDataUrl(pdfBlob, 260);
            if (!renderedPreview) {
              schedulePdfPreviewRetry(pendingMessage.id);
              continue;
            }

            if (isCancelled) return;

            const nextPreview: PdfMessagePreview = {
              coverDataUrl: renderedPreview.coverDataUrl,
              pageCount: renderedPreview.pageCount,
              cacheKey,
            };
            setCachedPdfMessagePreview(pendingMessage.id, nextPreview);
            pdfPreviewRetryAttemptsRef.current.delete(pendingMessage.id);
            clearPdfPreviewRetryTimer(pendingMessage.id);
            setPdfMessagePreviews(previousPreviews => ({
              ...previousPreviews,
              [pendingMessage.id]: nextPreview,
            }));
          } catch (error) {
            console.error('Error rendering PDF message preview:', error);
            schedulePdfPreviewRetry(pendingMessage.id);
          } finally {
            pdfPreviewRenderingIdsRef.current.delete(pendingMessage.id);
          }
        }
      } catch (error) {
        console.error('Error preparing PDF preview renderer:', error);
        for (const pendingMessage of pendingPdfMessages) {
          schedulePdfPreviewRetry(pendingMessage.id);
        }
      }
    };

    void renderPdfPreviews();

    return () => {
      isCancelled = true;
    };
  }, [
    clearPdfPreviewRetryTimer,
    getAttachmentFileKind,
    getAttachmentFileName,
    messages,
    pdfMessagePreviews,
    schedulePdfPreviewRetry,
  ]);

  return {
    pdfMessagePreviews,
    getPdfMessagePreview: (message: ChatMessage, fileName: string | null) => {
      const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
      const localPreview = pdfMessagePreviews[message.id];
      if (localPreview?.cacheKey === cacheKey) {
        return localPreview;
      }

      return cacheKey ? getCachedPdfMessagePreview(cacheKey) : undefined;
    },
  };
};
