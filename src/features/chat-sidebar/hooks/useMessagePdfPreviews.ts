import type { ChatMessage } from '../data/chatSidebarGateway';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type PdfMessagePreviewCacheEntry } from '../utils/chatRuntimeCache';
import { chatRuntime } from '../utils/chatRuntime';
import {
  buildPdfMessagePreviewCacheKey,
  type ResolvedPdfMessagePreviewAssetEntry,
  isResolvedPdfMessagePreviewAssetFresh,
  renderPdfMessagePreview,
  resolvePersistedPdfMessagePreview,
} from '../utils/pdf-message-preview';
import { resolveChatAssetUrlWithExpiry } from '../utils/message-file';
import {
  PDF_PREVIEW_MAX_RETRY_ATTEMPTS,
  PDF_PREVIEW_RETRY_BASE_DELAY_MS,
} from './message-pdf-previews/constants';
import { runConcurrentPdfPreviewTasks } from './message-pdf-previews/concurrency';
import {
  getPendingPdfPreviewAssetMessages,
  getPendingPdfRenderMessages,
} from './message-pdf-previews/pdfPreviewCandidates';
import {
  getActivePdfMessageIds,
  type PdfPreviewMessageAccessors,
} from './message-pdf-previews/pdfPreviewMessages';
import {
  getPdfMessagePreviewFromState,
  prunePdfMessagePreviews,
  pruneResolvedPdfPreviewAssetEntries,
} from './message-pdf-previews/pdfPreviewState';

export type { PdfMessagePreview } from '../utils/pdf-message-preview';

interface UseMessagePdfPreviewsProps extends PdfPreviewMessageAccessors {
  messages: ChatMessage[];
}

export const useMessagePdfPreviews = ({
  messages,
  getAttachmentFileName,
  getAttachmentFileKind,
}: UseMessagePdfPreviewsProps) => {
  const [pdfMessagePreviews, setPdfMessagePreviews] = useState<
    Record<string, PdfMessagePreviewCacheEntry>
  >({});
  const [resolvedPdfPreviewAssetEntries, setResolvedPdfPreviewAssetEntries] =
    useState<Record<string, ResolvedPdfMessagePreviewAssetEntry>>({});
  const [pdfPreviewRetryNonce, setPdfPreviewRetryNonce] = useState(0);
  const pdfPreviewRenderingIdsRef = useRef<Set<string>>(new Set());
  const pdfPreviewRetryAttemptsRef = useRef<Map<string, number>>(new Map());
  const pdfPreviewRetryTimersRef = useRef<Map<string, number>>(new Map());
  const pdfPreviewAssetExpiryTimerRef = useRef<number | null>(null);
  const pdfPreviewAccessors = useMemo<PdfPreviewMessageAccessors>(
    () => ({
      getAttachmentFileKind,
      getAttachmentFileName,
    }),
    [getAttachmentFileKind, getAttachmentFileName]
  );

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
      if (pdfPreviewAssetExpiryTimerRef.current !== null) {
        window.clearTimeout(pdfPreviewAssetExpiryTimerRef.current);
        pdfPreviewAssetExpiryTimerRef.current = null;
      }
      pdfPreviewRetryTimers.forEach(timerId => {
        window.clearTimeout(timerId);
      });
      pdfPreviewRetryTimers.clear();
    };
  }, []);

  useEffect(() => {
    setPdfMessagePreviews(previousPreviews => {
      return prunePdfMessagePreviews({
        accessors: pdfPreviewAccessors,
        messages,
        previousPreviews,
      });
    });
  }, [messages, pdfPreviewAccessors]);

  useEffect(() => {
    setResolvedPdfPreviewAssetEntries(previousEntries => {
      return pruneResolvedPdfPreviewAssetEntries({
        accessors: pdfPreviewAccessors,
        messages,
        pdfMessagePreviews,
        previousEntries,
      });
    });
  }, [messages, pdfMessagePreviews, pdfPreviewAccessors]);

  useEffect(() => {
    if (pdfPreviewAssetExpiryTimerRef.current !== null) {
      window.clearTimeout(pdfPreviewAssetExpiryTimerRef.current);
      pdfPreviewAssetExpiryTimerRef.current = null;
    }

    const nextExpiryAt = Object.values(resolvedPdfPreviewAssetEntries).reduce<
      number | null
    >((closestExpiryAt, previewEntry) => {
      if (previewEntry.expiresAt === null) {
        return closestExpiryAt;
      }

      if (
        closestExpiryAt === null ||
        previewEntry.expiresAt < closestExpiryAt
      ) {
        return previewEntry.expiresAt;
      }

      return closestExpiryAt;
    }, null);

    if (nextExpiryAt === null) {
      return;
    }

    pdfPreviewAssetExpiryTimerRef.current = window.setTimeout(
      () => {
        setResolvedPdfPreviewAssetEntries(previousEntries => {
          const now = Date.now();
          let hasChanges = false;
          const nextEntries: Record<
            string,
            ResolvedPdfMessagePreviewAssetEntry
          > = {};

          Object.entries(previousEntries).forEach(
            ([messageId, previewEntry]) => {
              if (!isResolvedPdfMessagePreviewAssetFresh(previewEntry, now)) {
                hasChanges = true;
                return;
              }

              nextEntries[messageId] = previewEntry;
            }
          );

          return hasChanges ? nextEntries : previousEntries;
        });
      },
      Math.max(nextExpiryAt - Date.now(), 0) + 1
    );

    return () => {
      if (pdfPreviewAssetExpiryTimerRef.current !== null) {
        window.clearTimeout(pdfPreviewAssetExpiryTimerRef.current);
        pdfPreviewAssetExpiryTimerRef.current = null;
      }
    };
  }, [resolvedPdfPreviewAssetEntries]);

  useEffect(() => {
    const activePdfMessageIds = getActivePdfMessageIds(
      messages,
      pdfPreviewAccessors
    );

    for (const [messageId] of pdfPreviewRetryAttemptsRef.current) {
      if (activePdfMessageIds.has(messageId)) continue;
      pdfPreviewRetryAttemptsRef.current.delete(messageId);
      clearPdfPreviewRetryTimer(messageId);
      pdfPreviewRenderingIdsRef.current.delete(messageId);
    }

    chatRuntime.pdfPreviews.pruneInactiveMessageIds(activePdfMessageIds);
  }, [clearPdfPreviewRetryTimer, messages, pdfPreviewAccessors]);

  useEffect(() => {
    let isCancelled = false;

    const pendingPreviewAssetMessages = getPendingPdfPreviewAssetMessages({
      accessors: pdfPreviewAccessors,
      messages,
      pdfMessagePreviews,
      resolvedPdfPreviewAssetEntries,
    });

    if (pendingPreviewAssetMessages.length === 0) {
      return;
    }

    const resolvePreviewAssets = async () => {
      await runConcurrentPdfPreviewTasks(
        pendingPreviewAssetMessages,
        async pendingMessage => {
          const persistedPreviewPath = pendingMessage.file_preview_url?.trim();
          if (!persistedPreviewPath || isCancelled) {
            return;
          }

          const pendingFileName = getAttachmentFileName(pendingMessage);
          const cacheKey = buildPdfMessagePreviewCacheKey(
            pendingMessage,
            pendingFileName
          );

          const resolvedPreviewEntry = await resolveChatAssetUrlWithExpiry(
            persistedPreviewPath,
            persistedPreviewPath
          );
          if (!resolvedPreviewEntry || isCancelled) {
            return;
          }

          const pageCount = Math.max(
            pendingMessage.file_preview_page_count ?? 1,
            1
          );
          setResolvedPdfPreviewAssetEntries(previousEntries => {
            const existingEntry = previousEntries[pendingMessage.id];
            if (
              existingEntry?.cacheKey === cacheKey &&
              existingEntry.coverUrl === resolvedPreviewEntry.url &&
              existingEntry.expiresAt === resolvedPreviewEntry.expiresAt &&
              existingEntry.pageCount === pageCount
            ) {
              return previousEntries;
            }

            return {
              ...previousEntries,
              [pendingMessage.id]: {
                cacheKey,
                coverUrl: resolvedPreviewEntry.url,
                expiresAt: resolvedPreviewEntry.expiresAt,
                pageCount,
              },
            };
          });
        }
      );
    };

    void resolvePreviewAssets();

    return () => {
      isCancelled = true;
    };
  }, [
    getAttachmentFileName,
    messages,
    pdfMessagePreviews,
    pdfPreviewAccessors,
    resolvedPdfPreviewAssetEntries,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const pendingPdfMessages = getPendingPdfRenderMessages({
      accessors: pdfPreviewAccessors,
      messages,
      pdfMessagePreviews,
      renderingMessageIds: pdfPreviewRenderingIdsRef.current,
      retryAttemptsByMessageId: pdfPreviewRetryAttemptsRef.current,
      retryTimersByMessageId: pdfPreviewRetryTimersRef.current,
    });

    if (pendingPdfMessages.length === 0) return;

    const syncResolvedPreview = (
      pendingMessage: ChatMessage,
      nextPreview: PdfMessagePreviewCacheEntry
    ) => {
      chatRuntime.pdfPreviews.set(pendingMessage.id, nextPreview);
      pdfPreviewRetryAttemptsRef.current.delete(pendingMessage.id);
      clearPdfPreviewRetryTimer(pendingMessage.id);
      setPdfMessagePreviews(previousPreviews => ({
        ...previousPreviews,
        [pendingMessage.id]: nextPreview,
      }));
    };

    const renderPdfPreviews = async () => {
      try {
        await runConcurrentPdfPreviewTasks(
          pendingPdfMessages,
          async pendingMessage => {
            if (isCancelled) return;
            pdfPreviewRenderingIdsRef.current.add(pendingMessage.id);

            const pendingFileName = getAttachmentFileName(pendingMessage);
            const cacheKey = buildPdfMessagePreviewCacheKey(
              pendingMessage,
              pendingFileName
            );

            try {
              const nextPreview =
                (await chatRuntime.pdfPreviews.loadPersistedEntry(cacheKey))
                  ?.preview ??
                (await resolvePersistedPdfMessagePreview(
                  pendingMessage,
                  cacheKey
                )) ??
                (await renderPdfMessagePreview(pendingMessage, cacheKey));
              if (!nextPreview) {
                schedulePdfPreviewRetry(pendingMessage.id);
                return;
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
        );
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
    getAttachmentFileName,
    messages,
    pdfMessagePreviews,
    pdfPreviewAccessors,
    pdfPreviewRetryNonce,
    schedulePdfPreviewRetry,
  ]);

  return {
    pdfMessagePreviews,
    getPdfMessagePreview: (message: ChatMessage, fileName: string | null) => {
      return getPdfMessagePreviewFromState({
        fileName,
        message,
        pdfMessagePreviews,
        resolvedPdfPreviewAssetEntries,
      });
    },
  };
};
