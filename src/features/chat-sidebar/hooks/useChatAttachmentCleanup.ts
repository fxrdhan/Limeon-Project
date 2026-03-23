import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import {
  chatSidebarCleanupGateway,
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { deleteChannelImageAssetsByMessageIds } from '../utils/channel-image-asset-cache';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { resolveDeletedThreadMessageIds } from '../utils/message-thread';

const normalizeStoragePaths = (
  storagePaths: Array<string | null | undefined>
) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

interface UseChatAttachmentCleanupProps {
  currentChannelId: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
}

export const useChatAttachmentCleanup = ({
  currentChannelId,
  setMessages,
  pendingImagePreviewUrlsRef,
  isConversationScopeActive,
}: UseChatAttachmentCleanupProps) => {
  const deleteUploadedStorageFiles = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const normalizedStoragePaths = normalizeStoragePaths(storagePaths);
      if (normalizedStoragePaths.length === 0) {
        return [];
      }

      const { data, error } =
        await chatSidebarCleanupGateway.cleanupStoragePaths(
          normalizedStoragePaths
        );
      const failedPaths =
        error || !data ? normalizedStoragePaths : data.failedStoragePaths;

      failedPaths.forEach(storagePath => {
        console.error(
          `Error deleting chat storage file after retry: ${storagePath}`
        );
      });

      return failedPaths;
    },
    []
  );

  const deleteUploadedStorageFilesOrThrow = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const failedPaths = await deleteUploadedStorageFiles(storagePaths);

      if (failedPaths.length === 0) {
        return;
      }

      throw new Error(
        `Failed to delete chat storage file(s): ${failedPaths.join(', ')}`
      );
    },
    [deleteUploadedStorageFiles]
  );

  const rollbackPersistedAttachmentThread = useCallback(
    async (
      persistedMessageId: string,
      storagePaths: Array<string | null | undefined>,
      conversationScopeKey: string | null
    ) => {
      const { data, error } =
        await chatSidebarCleanupGateway.deleteMessageThreadAndCleanup(
          persistedMessageId
        );

      if (error) {
        try {
          const { data: persistedMessage, error: persistedMessageError } =
            await chatSidebarMessagesGateway.getMessageById(persistedMessageId);

          if (!persistedMessageError && !persistedMessage) {
            await deleteUploadedStorageFilesOrThrow(storagePaths);
          }
        } catch (verificationError) {
          console.error(
            'Error verifying attachment rollback state:',
            verificationError
          );
        }

        throw error;
      }

      const effectiveDeletedMessageIds = resolveDeletedThreadMessageIds(
        data?.deletedMessageIds,
        [persistedMessageId]
      );

      chatRuntimeCache.pdfPreviews.deleteByMessageIds(
        effectiveDeletedMessageIds
      );
      if (currentChannelId?.trim()) {
        void deleteChannelImageAssetsByMessageIds(
          currentChannelId,
          effectiveDeletedMessageIds
        );
      }

      if (isConversationScopeActive(conversationScopeKey)) {
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem => !effectiveDeletedMessageIds.includes(messageItem.id)
          )
        );
      }

      data?.failedStoragePaths.forEach(storagePath => {
        console.error(
          `Error deleting chat storage file after server cleanup: ${storagePath}`
        );
      });
    },
    [
      currentChannelId,
      deleteUploadedStorageFilesOrThrow,
      isConversationScopeActive,
      setMessages,
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
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  };
};
