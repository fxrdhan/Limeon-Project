import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { getPersistedDeletedThreadMessageIds } from '../utils/message-thread';
import { getAttachmentCaptionMessageIds } from '../utils/message-relations';
import { isTempMessageId } from '../utils/optimistic-message';
import { resolveChatMessageStoragePaths } from '../utils/message-file';
import type { DeleteMessageOptions } from './chatComposerActionTypes';

interface UseChatMessageDeleteActionProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  editingMessageId: string | null;
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  closeMessageMenu: () => void;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingSendRegistryRef: MutableRefObject<Map<string, { cancelled: boolean }>>;
  deleteUploadedStorageFiles: (
    storagePaths: Array<string | null | undefined>
  ) => Promise<string[]>;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

export const useChatMessageDeleteAction = ({
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  editingMessageId,
  setEditingMessageId,
  setMessage,
  closeMessageMenu,
  broadcastDeletedMessage,
  pendingSendRegistryRef,
  deleteUploadedStorageFiles,
  reconcileCurrentConversationMessages,
  isCurrentConversationScopeActive,
  runInCurrentConversationScope,
}: UseChatMessageDeleteActionProps) => {
  const handleDeleteMessage = useCallback(
    async (
      targetMessage: ChatMessage,
      options?: DeleteMessageOptions
    ): Promise<boolean> => {
      if (!user || !targetUser || !currentChannelId) return false;

      closeMessageMenu();
      const linkedCaptionMessageIds = getAttachmentCaptionMessageIds(
        messages,
        targetMessage
      );
      const messageIdsToDelete = [...linkedCaptionMessageIds, targetMessage.id];
      const threadMessages = messages.filter(messageItem =>
        messageIdsToDelete.includes(messageItem.id)
      );
      const storagePathsToDelete = [
        ...new Set(
          threadMessages.flatMap(messageItem =>
            resolveChatMessageStoragePaths(messageItem)
          )
        ),
      ];
      const messagesSnapshot = messages.map(messageItem => ({
        ...messageItem,
      }));

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !messageIdsToDelete.includes(messageItem.id)
        )
      );

      if (editingMessageId && messageIdsToDelete.includes(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      const isPersistedThread = !isTempMessageId(targetMessage.id);
      if (!isPersistedThread) {
        const pendingEntry = pendingSendRegistryRef.current.get(
          targetMessage.id
        );
        if (pendingEntry) {
          pendingEntry.cancelled = true;
        }
        return true;
      }

      try {
        const { data: deletedMessageIds, error } =
          await chatSidebarGateway.deleteMessageThread(targetMessage.id);
        if (error) {
          console.error('Error deleting message thread:', error);
          throw error;
        }

        const broadcastTargetIds = getPersistedDeletedThreadMessageIds(
          deletedMessageIds,
          messageIdsToDelete
        );

        runInCurrentConversationScope(() => {
          broadcastTargetIds.forEach(deletedMessageId => {
            broadcastDeletedMessage(deletedMessageId);
          });
        });

        if (storagePathsToDelete.length > 0) {
          const failedStoragePaths =
            await deleteUploadedStorageFiles(storagePathsToDelete);
          if (failedStoragePaths.length > 0) {
            options?.onStorageCleanupFailure?.(failedStoragePaths);
            if (
              !options?.suppressErrorToast &&
              isCurrentConversationScopeActive()
            ) {
              toast.error(
                'Pesan dihapus, tetapi sebagian file lampiran gagal dibersihkan',
                {
                  toasterId: CHAT_SIDEBAR_TOASTER_ID,
                }
              );
            }
          }
        }

        return true;
      } catch (error) {
        console.error('Error deleting message:', error);
        await reconcileCurrentConversationMessages({
          fallbackMessages: messagesSnapshot,
        });
        if (
          !options?.suppressErrorToast &&
          isCurrentConversationScopeActive()
        ) {
          toast.error('Gagal menghapus pesan', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return false;
      }
    },
    [
      broadcastDeletedMessage,
      closeMessageMenu,
      currentChannelId,
      deleteUploadedStorageFiles,
      editingMessageId,
      isCurrentConversationScopeActive,
      messages,
      pendingSendRegistryRef,
      reconcileCurrentConversationMessages,
      runInCurrentConversationScope,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
    ]
  );

  return {
    handleDeleteMessage,
  };
};
