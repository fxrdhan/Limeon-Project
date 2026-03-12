import type { ChatMessage } from '../data/chatSidebarGateway';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  chatRuntimeCache,
  type PdfMessagePreviewCacheEntry,
} from '../utils/chatRuntimeCache';
import {
  buildPdfMessagePreviewCacheKey,
  isPdfPreviewableMessage,
  renderPdfMessagePreview,
  resolvePersistedPdfMessagePreview,
} from '../utils/pdf-message-preview';

export type PdfMessagePreview = PdfMessagePreviewCacheEntry;
const PDF_PREVIEW_MAX_RETRY_ATTEMPTS = 3;
const PDF_PREVIEW_RETRY_BASE_DELAY_MS = 900;

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
  const [pdfPreviewRetryNonce, setPdfPreviewRetryNonce] = useState(0);
  const pdfPreviewRenderingIdsRef = useRef<Set<string>>(new Set());
  const pdfPreviewRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  const pdfPreviewRetryTimersRef = useRef<Map<string, number>>(new Map());

  const clearPdfPreviewRetryTimer = useCallback((messageId: string) => {
    const existingTimerId = pdfPreviewRetryTimersRef.current.get(messageId);
    if (!existingTimerId) return;
    window.clearTimeout(existingTimerId);
    pdfPreviewRetryTimersRef.current.delete(messageId);
  }, []);

  const schedulePdfPreviewRetry = useCallback((messageId: string) => {
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
  }, []);

  useEffect(() => {
    const pdfPreviewRetryTimers = pdfPreviewRetryTimersRef.current;

    return () => {
      pdfPreviewRetryTimers.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      pdfPreviewRetryTimers.clear();
    };
  }, []);

  useEffect(() => {
    setPdfMessagePreviews(previousPreviews => {
      let hasChanges = false;
      const nextPreviews: Record<string, PdfMessagePreview> = {};

      for (const message of messages) {
        if (message.message_type !== 'file') continue;
        if (getAttachmentFileKind(message) !== 'document') continue;

        const fileName = getAttachmentFileName(message);
        if (!isPdfPreviewableMessage(message, fileName)) continue;

        const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
        const existingPreview = previousPreviews[message.id];

        if (existingPreview?.cacheKey === cacheKey) {
          nextPreviews[message.id] = existingPreview;
          continue;
        }

        const cachedPreview = chatRuntimeCache.pdfPreviews.get(cacheKey);
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
      if (!isPdfPreviewableMessage(message, fileName)) continue;

      activePdfMessageIds.add(message.id);
    }

    for (const [messageId] of pdfPreviewRetryAttemptsRef.current) {
      if (activePdfMessageIds.has(messageId)) continue;
      pdfPreviewRetryAttemptsRef.current.delete(messageId);
      clearPdfPreviewRetryTimer(messageId);
      pdfPreviewRenderingIdsRef.current.delete(messageId);
    }

    chatRuntimeCache.pdfPreviews.pruneInactiveMessageIds(activePdfMessageIds);
  }, [
    clearPdfPreviewRetryTimer,
    getAttachmentFileKind,
    getAttachmentFileName,
    messages,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const pendingPdfMessages = messages.filter(message => {
      if (message.message_type !== 'file') return false;
      if (getAttachmentFileKind(message) !== 'document') return false;

      const fileName = getAttachmentFileName(message);
      if (!isPdfPreviewableMessage(message, fileName)) return false;

      const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
      if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) return false;
      if (chatRuntimeCache.pdfPreviews.get(cacheKey)) return false;
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

    const syncResolvedPreview = (
      pendingMessage: ChatMessage,
      nextPreview: PdfMessagePreview
    ) => {
      chatRuntimeCache.pdfPreviews.set(pendingMessage.id, nextPreview);
      pdfPreviewRetryAttemptsRef.current.delete(pendingMessage.id);
      clearPdfPreviewRetryTimer(pendingMessage.id);
      setPdfMessagePreviews(previousPreviews => ({
        ...previousPreviews,
        [pendingMessage.id]: nextPreview,
      }));
    };

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
            const nextPreview =
              (await resolvePersistedPdfMessagePreview(
                pendingMessage,
                cacheKey
              )) ?? (await renderPdfMessagePreview(pendingMessage, cacheKey));
            if (!nextPreview) {
              schedulePdfPreviewRetry(pendingMessage.id);
              continue;
            }

            if (isCancelled) return;
            syncResolvedPreview(pendingMessage, nextPreview);
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
    pdfPreviewRetryNonce,
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

      return cacheKey ? chatRuntimeCache.pdfPreviews.get(cacheKey) : undefined;
    },
  };
};
