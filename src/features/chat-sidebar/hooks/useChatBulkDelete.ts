import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type {
  DeleteMessagesOptions,
  DeleteMessagesResult,
} from './chatComposerActionTypes';

interface UseChatBulkDeleteProps {
  user?: {
    id: string;
  } | null;
  selectedVisibleMessages: ChatMessage[];
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
  deleteMessages: (
    targetMessages: ChatMessage[],
    options?: DeleteMessagesOptions
  ) => Promise<DeleteMessagesResult>;
}

export const useChatBulkDelete = ({
  user,
  selectedVisibleMessages,
  setSelectedMessageIds,
  deleteMessages,
}: UseChatBulkDeleteProps) =>
  useCallback(async () => {
    if (!user) return;

    const deletableMessages = selectedVisibleMessages.filter(
      messageItem => messageItem.sender_id === user.id
    );

    if (deletableMessages.length === 0) {
      toast.error('Pilih minimal 1 pesan Anda untuk dihapus', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const {
      deletedTargetMessageIds,
      failedTargetMessageIds,
      cleanupWarningTargetMessageIds,
    } = await deleteMessages(deletableMessages, {
      suppressErrorToast: true,
    });
    const deletedMessageIds = new Set(deletedTargetMessageIds);
    const deletedCount = deletedTargetMessageIds.length;
    const failedCount = failedTargetMessageIds.length;
    const cleanupWarningCount = cleanupWarningTargetMessageIds.length;

    setSelectedMessageIds(previousSelectedIds => {
      const nextSelectedIds = new Set<string>();
      previousSelectedIds.forEach(messageId => {
        if (!deletedMessageIds.has(messageId)) {
          nextSelectedIds.add(messageId);
        }
      });
      return nextSelectedIds;
    });

    if (cleanupWarningCount > 0 && deletedCount > 0) {
      const toastMessage =
        failedCount > 0
          ? `${deletedCount} pesan dihapus, ${failedCount} gagal, dan ${cleanupWarningCount} cleanup lampiran gagal`
          : `${deletedCount} pesan dihapus, tetapi ${cleanupWarningCount} cleanup lampiran gagal`;
      toast.error(toastMessage, {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    if (failedCount === 0 && deletedCount === deletableMessages.length) {
      toast.success(`${deletedCount} pesan berhasil dihapus`, {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    if (deletedCount === 0) {
      toast.error('Gagal menghapus pesan terpilih', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    toast.error(`${deletedCount} pesan dihapus, ${failedCount} gagal`, {
      toasterId: CHAT_SIDEBAR_TOASTER_ID,
    });
  }, [deleteMessages, selectedVisibleMessages, setSelectedMessageIds, user]);
