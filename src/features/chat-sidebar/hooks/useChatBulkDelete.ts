import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { DeleteMessageOptions } from './useChatComposerActions';

interface UseChatBulkDeleteProps {
  user?: {
    id: string;
  } | null;
  selectedVisibleMessages: ChatMessage[];
  setSelectedMessageIds: Dispatch<SetStateAction<Set<string>>>;
  deleteMessage: (
    targetMessage: ChatMessage,
    options?: DeleteMessageOptions
  ) => Promise<boolean>;
}

export const useChatBulkDelete = ({
  user,
  selectedVisibleMessages,
  setSelectedMessageIds,
  deleteMessage,
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

    const deletedMessageIds = new Set<string>();

    for (const messageItem of deletableMessages) {
      const didDelete = await deleteMessage(messageItem, {
        suppressErrorToast: true,
      });
      if (!didDelete) continue;
      deletedMessageIds.add(messageItem.id);
    }

    setSelectedMessageIds(previousSelectedIds => {
      const nextSelectedIds = new Set<string>();
      previousSelectedIds.forEach(messageId => {
        if (!deletedMessageIds.has(messageId)) {
          nextSelectedIds.add(messageId);
        }
      });
      return nextSelectedIds;
    });

    const deletedCount = deletedMessageIds.size;
    if (deletedCount === deletableMessages.length) {
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

    toast.error(`${deletedCount} pesan dihapus, sebagian gagal`, {
      toasterId: CHAT_SIDEBAR_TOASTER_ID,
    });
  }, [deleteMessage, selectedVisibleMessages, setSelectedMessageIds, user]);
