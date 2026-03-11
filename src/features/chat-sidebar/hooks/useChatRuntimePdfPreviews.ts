import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';
import {
  ackPendingPdfPreviewJob,
  hasPendingPdfPreviewJobs,
  incrementPendingPdfPreviewJobAttempts,
  peekPendingPdfPreviewJobs,
  persistQueuedPdfPreviewJob,
  subscribePendingPdfPreviewQueue,
} from '../utils/pdf-preview-persistence';

const PDF_PREVIEW_RUNTIME_BATCH_SIZE = 2;
const PDF_PREVIEW_RUNTIME_BATCH_WINDOW_MS = 120;
const PDF_PREVIEW_RUNTIME_RETRY_DELAY_MS = 1_800;
const PDF_PREVIEW_RUNTIME_MAX_ATTEMPTS = 3;

export const useChatRuntimePdfPreviews = () => {
  const { user } = useAuthStore();
  const flushTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const isFlushInFlightRef = useRef(false);
  const flushPendingPdfPreviewsRef = useRef<() => Promise<void>>(
    async () => {}
  );

  const clearFlushTimer = useCallback(() => {
    if (flushTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = null;
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = null;
  }, []);

  const schedulePendingPdfPreviewFlush = useCallback(
    (delayMs = PDF_PREVIEW_RUNTIME_BATCH_WINDOW_MS) => {
      if (flushTimeoutRef.current !== null || !user?.id) {
        return;
      }

      flushTimeoutRef.current = window.setTimeout(() => {
        flushTimeoutRef.current = null;
        void flushPendingPdfPreviewsRef.current();
      }, delayMs);
    },
    [user?.id]
  );

  const schedulePendingPdfPreviewRetry = useCallback(() => {
    if (retryTimeoutRef.current !== null || !user?.id) {
      return;
    }

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;
      schedulePendingPdfPreviewFlush(0);
    }, PDF_PREVIEW_RUNTIME_RETRY_DELAY_MS);
  }, [schedulePendingPdfPreviewFlush, user?.id]);

  const flushPendingPdfPreviews = useCallback(async () => {
    if (!user?.id || isFlushInFlightRef.current) {
      return;
    }

    const pendingJobs = peekPendingPdfPreviewJobs(
      user.id,
      PDF_PREVIEW_RUNTIME_BATCH_SIZE
    );
    if (pendingJobs.length === 0) {
      return;
    }

    isFlushInFlightRef.current = true;
    clearRetryTimer();

    try {
      for (const pendingJob of pendingJobs) {
        const didPersistPreview = await persistQueuedPdfPreviewJob(pendingJob);
        if (didPersistPreview) {
          ackPendingPdfPreviewJob(pendingJob.messageId);
          continue;
        }

        const nextAttemptCount = incrementPendingPdfPreviewJobAttempts(
          pendingJob.messageId
        );
        if (nextAttemptCount >= PDF_PREVIEW_RUNTIME_MAX_ATTEMPTS) {
          ackPendingPdfPreviewJob(pendingJob.messageId);
        }
      }

      if (hasPendingPdfPreviewJobs(user.id)) {
        schedulePendingPdfPreviewFlush(0);
      }
    } catch (error) {
      console.error('Error syncing pending PDF previews:', error);
      schedulePendingPdfPreviewRetry();
    } finally {
      isFlushInFlightRef.current = false;
    }
  }, [
    clearRetryTimer,
    schedulePendingPdfPreviewFlush,
    schedulePendingPdfPreviewRetry,
    user?.id,
  ]);
  flushPendingPdfPreviewsRef.current = flushPendingPdfPreviews;

  useEffect(() => {
    if (!user?.id) {
      clearFlushTimer();
      clearRetryTimer();
      isFlushInFlightRef.current = false;
      return;
    }

    const unsubscribe = subscribePendingPdfPreviewQueue(() => {
      schedulePendingPdfPreviewFlush();
    });

    if (hasPendingPdfPreviewJobs(user.id)) {
      schedulePendingPdfPreviewFlush(0);
    }

    return () => {
      unsubscribe();
      clearFlushTimer();
      clearRetryTimer();
      isFlushInFlightRef.current = false;
    };
  }, [
    clearFlushTimer,
    clearRetryTimer,
    schedulePendingPdfPreviewFlush,
    user?.id,
  ]);
};
