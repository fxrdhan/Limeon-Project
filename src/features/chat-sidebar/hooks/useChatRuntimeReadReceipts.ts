import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { chatSidebarMessagesGateway } from '../data/chatSidebarGateway';
import {
  ackPendingReadReceiptMessageIds,
  hasPendingReadReceiptMessageIds,
  peekPendingReadReceiptMessageIds,
  subscribePendingReadReceiptQueue,
} from '../utils/pending-read-receipts';

const READ_RECEIPT_BATCH_SIZE = 200;
const READ_RECEIPT_BATCH_WINDOW_MS = 90;
const READ_RECEIPT_RETRY_DELAY_MS = 1_200;
const CHAT_READ_SYNC_TOAST_ID = 'chat-read-sync-warning';

export const useChatRuntimeReadReceipts = () => {
  const { user } = useAuthStore();
  const flushTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const isFlushInFlightRef = useRef(false);
  const flushPendingReadReceiptsRef = useRef<() => Promise<void>>(
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

  const schedulePendingReadReceiptFlush = useCallback(
    (delayMs = READ_RECEIPT_BATCH_WINDOW_MS) => {
      if (flushTimeoutRef.current !== null || !user?.id) {
        return;
      }

      flushTimeoutRef.current = window.setTimeout(() => {
        flushTimeoutRef.current = null;
        void flushPendingReadReceiptsRef.current();
      }, delayMs);
    },
    [user?.id]
  );

  const schedulePendingReadReceiptRetry = useCallback(() => {
    if (retryTimeoutRef.current !== null || !user?.id) {
      return;
    }

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;
      schedulePendingReadReceiptFlush(0);
    }, READ_RECEIPT_RETRY_DELAY_MS);
  }, [schedulePendingReadReceiptFlush, user?.id]);

  const flushPendingReadReceipts = useCallback(async () => {
    if (!user?.id || isFlushInFlightRef.current) {
      return;
    }

    const pendingMessageIds = peekPendingReadReceiptMessageIds(
      user.id,
      READ_RECEIPT_BATCH_SIZE
    );
    if (pendingMessageIds.length === 0) {
      toast.dismiss(CHAT_READ_SYNC_TOAST_ID);
      return;
    }

    isFlushInFlightRef.current = true;
    clearRetryTimer();

    try {
      const { error } =
        await chatSidebarMessagesGateway.markMessageIdsAsRead(
          pendingMessageIds
        );

      if (error) {
        console.error('Error syncing pending read receipts:', error);
        toast.error(
          'Sinkronisasi status baca chat tertunda. Akan dicoba lagi otomatis.',
          {
            id: CHAT_READ_SYNC_TOAST_ID,
          }
        );
        schedulePendingReadReceiptRetry();
        return;
      }

      ackPendingReadReceiptMessageIds(user.id, pendingMessageIds);

      if (hasPendingReadReceiptMessageIds(user.id)) {
        schedulePendingReadReceiptFlush(0);
        return;
      }

      toast.dismiss(CHAT_READ_SYNC_TOAST_ID);
    } catch (error) {
      console.error('Caught error syncing pending read receipts:', error);
      toast.error(
        'Sinkronisasi status baca chat tertunda. Akan dicoba lagi otomatis.',
        {
          id: CHAT_READ_SYNC_TOAST_ID,
        }
      );
      schedulePendingReadReceiptRetry();
    } finally {
      isFlushInFlightRef.current = false;
    }
  }, [
    clearRetryTimer,
    schedulePendingReadReceiptFlush,
    schedulePendingReadReceiptRetry,
    user?.id,
  ]);
  flushPendingReadReceiptsRef.current = flushPendingReadReceipts;

  useEffect(() => {
    if (!user?.id) {
      clearFlushTimer();
      clearRetryTimer();
      isFlushInFlightRef.current = false;
      toast.dismiss(CHAT_READ_SYNC_TOAST_ID);
      return;
    }

    const unsubscribe = subscribePendingReadReceiptQueue(() => {
      schedulePendingReadReceiptFlush();
    });

    if (hasPendingReadReceiptMessageIds(user.id)) {
      schedulePendingReadReceiptFlush(0);
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
    schedulePendingReadReceiptFlush,
    user?.id,
  ]);
};
