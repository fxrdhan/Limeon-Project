import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { CHAT_IMAGE_BUCKET } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  getPersistedDeletedThreadMessageIds,
  resolveDeletedThreadMessageIds,
} from '../utils/message-thread';

const normalizeStoragePaths = (
  storagePaths: Array<string | null | undefined>
) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

interface UseChatAttachmentCleanupProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
}

export const useChatAttachmentCleanup = ({
  user,
  targetUser,
  currentChannelId,
  setMessages,
  broadcastDeletedMessage,
  pendingImagePreviewUrlsRef,
  isConversationScopeActive,
}: UseChatAttachmentCleanupProps) => {
  const deleteUploadedStorageFiles = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const uniquePaths = normalizeStoragePaths(storagePaths);

      if (uniquePaths.length === 0) return;

      const results = await Promise.allSettled(
        uniquePaths.map(storagePath =>
          chatSidebarGateway.deleteStorageFile(CHAT_IMAGE_BUCKET, storagePath)
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') return;
        console.error(
          `Error deleting chat storage file: ${uniquePaths[index]}`,
          result.reason
        );
      });
    },
    []
  );

  const deleteUploadedStorageFilesOrThrow = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const uniquePaths = normalizeStoragePaths(storagePaths);

      if (uniquePaths.length === 0) return;

      const results = await Promise.allSettled(
        uniquePaths.map(storagePath =>
          chatSidebarGateway.deleteStorageFile(CHAT_IMAGE_BUCKET, storagePath)
        )
      );
      const failedPaths = results.flatMap((result, index) =>
        result.status === 'rejected' ? [uniquePaths[index]] : []
      );

      if (failedPaths.length === 0) {
        return;
      }

      throw new Error(
        `Failed to delete chat storage file(s): ${failedPaths.join(', ')}`
      );
    },
    []
  );

  const rollbackPersistedAttachmentThread = useCallback(
    async (
      persistedMessageId: string,
      storagePaths: Array<string | null | undefined>,
      conversationScopeKey: string | null
    ) => {
      const { data: deletedMessageIds, error } =
        await chatSidebarGateway.deleteMessageThread(persistedMessageId);

      if (error) {
        if (user && targetUser && currentChannelId) {
          try {
            const { data: latestMessages, error: latestMessagesError } =
              await chatSidebarGateway.fetchConversationMessages(
                user.id,
                targetUser.id,
                currentChannelId
              );

            if (!latestMessagesError && latestMessages) {
              const messageStillExists = latestMessages.some(
                messageItem => messageItem.id === persistedMessageId
              );

              if (!messageStillExists) {
                await deleteUploadedStorageFilesOrThrow(storagePaths);
              }
            }
          } catch (verificationError) {
            console.error(
              'Error verifying attachment rollback state:',
              verificationError
            );
          }
        }

        throw error;
      }

      const effectiveDeletedMessageIds = resolveDeletedThreadMessageIds(
        deletedMessageIds,
        [persistedMessageId]
      );

      if (isConversationScopeActive(conversationScopeKey)) {
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem => !effectiveDeletedMessageIds.includes(messageItem.id)
          )
        );

        getPersistedDeletedThreadMessageIds(deletedMessageIds, [
          persistedMessageId,
        ]).forEach(messageId => {
          broadcastDeletedMessage(messageId);
        });
      }

      await deleteUploadedStorageFilesOrThrow(storagePaths);
    },
    [
      broadcastDeletedMessage,
      currentChannelId,
      deleteUploadedStorageFilesOrThrow,
      isConversationScopeActive,
      setMessages,
      targetUser,
      user,
    ]
  );

  const releasePendingPreviewUrl = useCallback(
    (tempId: string, shouldDelayCleanup = false) => {
      const previewUrl = pendingImagePreviewUrlsRef.current.get(tempId);
      if (!previewUrl) {
        return;
      }

      if (shouldDelayCleanup) {
        window.setTimeout(() => {
          URL.revokeObjectURL(previewUrl);
        }, 30_000);
      } else {
        URL.revokeObjectURL(previewUrl);
      }

      pendingImagePreviewUrlsRef.current.delete(tempId);
    },
    [pendingImagePreviewUrlsRef]
  );

  return {
    deleteUploadedStorageFiles,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  };
};
