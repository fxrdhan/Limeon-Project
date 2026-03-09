import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { CHAT_IMAGE_BUCKET } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { resolveDeletedThreadMessageIds } from '../utils/message-thread';

const STORAGE_DELETE_MAX_ATTEMPTS = 3;
const STORAGE_DELETE_RETRY_DELAY_MS = 180;

const normalizeStoragePaths = (
  storagePaths: Array<string | null | undefined>
) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

const wait = (durationMs: number) =>
  new Promise(resolve => {
    window.setTimeout(resolve, durationMs);
  });

interface UseChatAttachmentCleanupProps {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
}

export const useChatAttachmentCleanup = ({
  setMessages,
  pendingImagePreviewUrlsRef,
  isConversationScopeActive,
}: UseChatAttachmentCleanupProps) => {
  const deleteStoragePathsWithRetry = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const remainingPaths = normalizeStoragePaths(storagePaths);

      if (remainingPaths.length === 0) {
        return [];
      }

      let pendingPaths = remainingPaths;

      for (
        let attemptIndex = 0;
        attemptIndex < STORAGE_DELETE_MAX_ATTEMPTS && pendingPaths.length > 0;
        attemptIndex += 1
      ) {
        const results = await Promise.allSettled(
          pendingPaths.map(storagePath =>
            chatSidebarGateway.deleteStorageFile(CHAT_IMAGE_BUCKET, storagePath)
          )
        );

        pendingPaths = results.flatMap((result, resultIndex) =>
          result.status === 'rejected' ? [pendingPaths[resultIndex]] : []
        );

        if (
          pendingPaths.length > 0 &&
          attemptIndex < STORAGE_DELETE_MAX_ATTEMPTS - 1
        ) {
          await wait(STORAGE_DELETE_RETRY_DELAY_MS * (attemptIndex + 1));
        }
      }

      return pendingPaths;
    },
    []
  );

  const deleteUploadedStorageFiles = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const failedPaths = await deleteStoragePathsWithRetry(storagePaths);

      failedPaths.forEach(storagePath => {
        console.error(
          `Error deleting chat storage file after retry: ${storagePath}`
        );
      });

      return failedPaths;
    },
    [deleteStoragePathsWithRetry]
  );

  const deleteUploadedStorageFilesOrThrow = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const failedPaths = await deleteStoragePathsWithRetry(storagePaths);

      if (failedPaths.length === 0) {
        return;
      }

      throw new Error(
        `Failed to delete chat storage file(s): ${failedPaths.join(', ')}`
      );
    },
    [deleteStoragePathsWithRetry]
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
        try {
          const { data: persistedMessage, error: persistedMessageError } =
            await chatSidebarGateway.getMessageById(persistedMessageId);

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
        deletedMessageIds,
        [persistedMessageId]
      );

      if (isConversationScopeActive(conversationScopeKey)) {
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem => !effectiveDeletedMessageIds.includes(messageItem.id)
          )
        );
      }

      await deleteUploadedStorageFilesOrThrow(storagePaths);
    },
    [deleteUploadedStorageFilesOrThrow, isConversationScopeActive, setMessages]
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
