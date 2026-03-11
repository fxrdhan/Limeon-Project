import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { chatSidebarCleanupGateway } from '../data/chatSidebarGateway';
import { useChatIncomingDeliveries } from './useChatIncomingDeliveries';
import { useChatRuntimePdfPreviews } from './useChatRuntimePdfPreviews';
import { useChatRuntimeReadReceipts } from './useChatRuntimeReadReceipts';

const CHAT_CLEANUP_RUNTIME_TOAST_ID = 'chat-cleanup-runtime-warning';
const CHAT_CLEANUP_RETRY_DELAY_MS = 60_000;

export const useChatRuntime = () => {
  const { user } = useAuthStore();
  const retryCleanupTimeoutRef = useRef<number | null>(null);
  const hadPendingCleanupFailuresRef = useRef(false);

  useChatIncomingDeliveries();
  useChatRuntimeReadReceipts();
  useChatRuntimePdfPreviews();

  useEffect(() => {
    const clearScheduledRetry = () => {
      if (retryCleanupTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(retryCleanupTimeoutRef.current);
      retryCleanupTimeoutRef.current = null;
    };

    if (!user?.id) {
      clearScheduledRetry();
      hadPendingCleanupFailuresRef.current = false;
      toast.dismiss(CHAT_CLEANUP_RUNTIME_TOAST_ID);
      return;
    }

    let isCancelled = false;

    const scheduleRetry = () => {
      if (retryCleanupTimeoutRef.current !== null) {
        return;
      }

      retryCleanupTimeoutRef.current = window.setTimeout(() => {
        retryCleanupTimeoutRef.current = null;
        void runCleanupRetry();
      }, CHAT_CLEANUP_RETRY_DELAY_MS);
    };

    const runCleanupRetry = async () => {
      const { data, error } =
        await chatSidebarCleanupGateway.retryChatCleanupFailures();
      if (isCancelled) {
        return;
      }

      if (error || !data) {
        console.error('Failed to retry chat cleanup failures:', error);
        hadPendingCleanupFailuresRef.current = true;
        toast.error(
          'Cleanup lampiran chat tertunda. Beberapa file sementara mungkin belum terhapus.',
          {
            id: CHAT_CLEANUP_RUNTIME_TOAST_ID,
          }
        );
        scheduleRetry();
        return;
      }

      if (data.remainingCount > 0) {
        console.warn(
          'Unresolved chat cleanup failures remain:',
          data.remainingCount
        );
        hadPendingCleanupFailuresRef.current = true;
        toast.error(
          `${data.remainingCount} cleanup lampiran chat masih tertunda. Akan dicoba lagi otomatis.`,
          {
            id: CHAT_CLEANUP_RUNTIME_TOAST_ID,
          }
        );
        scheduleRetry();
        return;
      }

      clearScheduledRetry();
      if (hadPendingCleanupFailuresRef.current && data.resolvedCount > 0) {
        toast.success(
          'Cleanup lampiran chat yang tertunda berhasil diselesaikan.',
          {
            id: CHAT_CLEANUP_RUNTIME_TOAST_ID,
          }
        );
      } else {
        toast.dismiss(CHAT_CLEANUP_RUNTIME_TOAST_ID);
      }
      hadPendingCleanupFailuresRef.current = false;
    };

    void runCleanupRetry();

    return () => {
      isCancelled = true;
      clearScheduledRetry();
    };
  }, [user?.id]);
};
