import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarCleanupGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { getAttachmentCaptionMessageIds } from '../utils/message-relations';
import { isTempMessageId } from '../utils/optimistic-message';
import type {
  DeleteMessageOptions,
  DeleteMessagesOptions,
  DeleteMessagesResult,
} from './chatComposerActionTypes';

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
  pendingSendRegistryRef: MutableRefObject<Map<string, { cancelled: boolean }>>;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  isCurrentConversationScopeActive: () => boolean;
}

interface ThreadDeletePlan {
  targetMessage: ChatMessage;
  threadMessageIds: string[];
  isPersistedThread: boolean;
}

const cloneMessagesSnapshot = (messages: ChatMessage[]) =>
  messages.map(messageItem => ({
    ...messageItem,
  }));

const buildThreadDeletePlan = (
  messages: ChatMessage[],
  targetMessage: ChatMessage
): ThreadDeletePlan => ({
  targetMessage,
  threadMessageIds: [
    ...getAttachmentCaptionMessageIds(messages, targetMessage),
    targetMessage.id,
  ],
  isPersistedThread: !isTempMessageId(targetMessage.id),
});

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
  pendingSendRegistryRef,
  reconcileCurrentConversationMessages,
  isCurrentConversationScopeActive,
}: UseChatMessageDeleteActionProps) => {
  const handleDeleteMessages = useCallback(
    async (
      targetMessages: ChatMessage[],
      options?: DeleteMessagesOptions
    ): Promise<DeleteMessagesResult> => {
      if (
        !user ||
        !targetUser ||
        !currentChannelId ||
        targetMessages.length === 0
      ) {
        return {
          deletedTargetMessageIds: [],
          failedTargetMessageIds: [],
          cleanupWarningTargetMessageIds: [],
        };
      }

      closeMessageMenu();

      const seenTargetMessageIds = new Set<string>();
      const deletePlans = targetMessages.reduce<ThreadDeletePlan[]>(
        (plans, targetMessage) => {
          if (seenTargetMessageIds.has(targetMessage.id)) {
            return plans;
          }

          seenTargetMessageIds.add(targetMessage.id);
          plans.push(buildThreadDeletePlan(messages, targetMessage));
          return plans;
        },
        []
      );
      const messageIdsToDelete = new Set(
        deletePlans.flatMap(deletePlan => deletePlan.threadMessageIds)
      );
      const tempThreadMessageIds = new Set<string>();
      const deletedTempTargetMessageIds: string[] = [];
      const persistedTargetMessageIds: string[] = [];
      const messagesSnapshot = cloneMessagesSnapshot(messages);

      deletePlans.forEach(deletePlan => {
        if (deletePlan.isPersistedThread) {
          persistedTargetMessageIds.push(deletePlan.targetMessage.id);
          return;
        }

        deletedTempTargetMessageIds.push(deletePlan.targetMessage.id);
        deletePlan.threadMessageIds.forEach(messageId => {
          tempThreadMessageIds.add(messageId);
        });
        const pendingEntry = pendingSendRegistryRef.current.get(
          deletePlan.targetMessage.id
        );
        if (pendingEntry) {
          pendingEntry.cancelled = true;
        }
      });

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !messageIdsToDelete.has(messageItem.id)
        )
      );

      if (editingMessageId && messageIdsToDelete.has(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      if (persistedTargetMessageIds.length === 0) {
        return {
          deletedTargetMessageIds: deletedTempTargetMessageIds,
          failedTargetMessageIds: [],
          cleanupWarningTargetMessageIds: [],
        };
      }

      try {
        const { data, error } =
          await chatSidebarCleanupGateway.deleteMessageThreadsAndCleanup(
            persistedTargetMessageIds
          );
        if (error || !data) {
          console.error('Error deleting message threads:', error);
          throw error;
        }

        if (data.failedTargetMessageIds.length > 0) {
          const successfullyDeletedMessageIds = new Set<string>([
            ...tempThreadMessageIds,
            ...data.deletedMessageIds,
          ]);

          await reconcileCurrentConversationMessages({
            fallbackMessages: messagesSnapshot.filter(
              messageItem => !successfullyDeletedMessageIds.has(messageItem.id)
            ),
          });
        }

        if (
          !options?.suppressErrorToast &&
          isCurrentConversationScopeActive()
        ) {
          if (data.failedTargetMessageIds.length > 0) {
            toast.error('Sebagian pesan gagal dihapus', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          } else if (data.cleanupWarningTargetMessageIds.length > 0) {
            toast.error(
              'Pesan dihapus, tetapi sebagian file lampiran gagal dibersihkan',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
          }
        }

        return {
          deletedTargetMessageIds: [
            ...deletedTempTargetMessageIds,
            ...data.deletedTargetMessageIds,
          ],
          failedTargetMessageIds: data.failedTargetMessageIds,
          cleanupWarningTargetMessageIds: data.cleanupWarningTargetMessageIds,
        };
      } catch (error) {
        console.error('Error deleting messages:', error);
        await reconcileCurrentConversationMessages({
          fallbackMessages: messagesSnapshot.filter(
            messageItem => !tempThreadMessageIds.has(messageItem.id)
          ),
        });
        if (
          !options?.suppressErrorToast &&
          isCurrentConversationScopeActive()
        ) {
          toast.error('Gagal menghapus pesan terpilih', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }

        return {
          deletedTargetMessageIds: deletedTempTargetMessageIds,
          failedTargetMessageIds: persistedTargetMessageIds,
          cleanupWarningTargetMessageIds: [],
        };
      }
    },
    [
      closeMessageMenu,
      currentChannelId,
      editingMessageId,
      isCurrentConversationScopeActive,
      messages,
      pendingSendRegistryRef,
      reconcileCurrentConversationMessages,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
    ]
  );

  const handleDeleteMessage = useCallback(
    async (
      targetMessage: ChatMessage,
      options?: DeleteMessageOptions
    ): Promise<boolean> => {
      if (!user || !targetUser || !currentChannelId) return false;

      closeMessageMenu();
      const deletePlan = buildThreadDeletePlan(messages, targetMessage);
      const messageIdsToDelete = deletePlan.threadMessageIds;
      const messagesSnapshot = cloneMessagesSnapshot(messages);

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !messageIdsToDelete.includes(messageItem.id)
        )
      );

      if (editingMessageId && messageIdsToDelete.includes(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      if (!deletePlan.isPersistedThread) {
        const pendingEntry = pendingSendRegistryRef.current.get(
          targetMessage.id
        );
        if (pendingEntry) {
          pendingEntry.cancelled = true;
        }
        return true;
      }

      try {
        const { data, error } =
          await chatSidebarCleanupGateway.deleteMessageThreadAndCleanup(
            targetMessage.id
          );
        if (error || !data) {
          console.error('Error deleting message thread:', error);
          throw error;
        }

        if (data.failedStoragePaths.length > 0) {
          options?.onStorageCleanupFailure?.(data.failedStoragePaths);
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
      closeMessageMenu,
      currentChannelId,
      editingMessageId,
      isCurrentConversationScopeActive,
      messages,
      pendingSendRegistryRef,
      reconcileCurrentConversationMessages,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
    ]
  );

  return {
    handleDeleteMessage,
    handleDeleteMessages,
  };
};
