import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { chatSidebarMessagesGateway } from '../data/chatSidebarGateway';
import {
  flushPendingReadReceiptBatch,
  getPendingReadReceiptBatch,
  sendPendingReadReceiptKeepalive,
  subscribePendingReadReceiptQueue,
} from '../utils/read-receipt-sync';

const READ_RECEIPT_BATCH_SIZE = 200;
const READ_RECEIPT_BATCH_WINDOW_MS = 90;
const READ_RECEIPT_RETRY_DELAY_MS = 1_200;
const CHAT_READ_SYNC_TOAST_ID = 'chat-read-sync-warning';

export const useChatRuntimeReadReceipts = () => {
  const { user, session } = useAuthStore();
  const flushTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const isFlushInFlightRef = useRef(false);
  const accessTokenRef = useRef<string | null>(session?.access_token ?? null);
  const flushPendingReadReceiptsRef = useRef<() => Promise<void>>(
    async () => {}
  );

  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null;
  }, [session?.access_token]);

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

    const pendingMessageIds = getPendingReadReceiptBatch(
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
      const result = await flushPendingReadReceiptBatch({
        userId: user.id,
        limit: READ_RECEIPT_BATCH_SIZE,
        submitBatch: messageIds =>
          chatSidebarMessagesGateway.markMessageIdsAsRead(messageIds),
      });

      if (result.status === 'retry') {
        console.error('Error syncing pending read receipts:', result.error);
        toast.error(
          'Sinkronisasi status baca chat tertunda. Akan dicoba lagi otomatis.',
          {
            id: CHAT_READ_SYNC_TOAST_ID,
          }
        );
        schedulePendingReadReceiptRetry();
        return;
      }

      if (result.status === 'synced' && result.hasMore) {
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

  const flushPendingReadReceiptsKeepalive = useCallback(() => {
    if (!user?.id) {
      return false;
    }

    return sendPendingReadReceiptKeepalive({
      userId: user.id,
      limit: READ_RECEIPT_BATCH_SIZE,
      sendKeepalive: messageIds =>
        chatSidebarMessagesGateway.sendReadReceiptKeepalive(
          messageIds,
          accessTokenRef.current
        ),
    });
  }, [user?.id]);

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

    if (getPendingReadReceiptBatch(user.id, 1).length > 0) {
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

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingReadReceiptsKeepalive();
      }
    };

    const handlePageExit = () => {
      flushPendingReadReceiptsKeepalive();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        handlePageExit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('unload', handlePageExit);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('unload', handlePageExit);
    };
  }, [flushPendingReadReceiptsKeepalive, user?.id]);
};
