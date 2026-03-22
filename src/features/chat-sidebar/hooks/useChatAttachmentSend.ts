import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatAttachmentCleanup } from './useChatAttachmentCleanup';
import { buildChatFilePath, buildChatImagePath } from '../utils/attachment';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import { sendAttachmentThread } from '../utils/attachment-thread-flow';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerFile,
  PendingSendRegistration,
} from '../types';

interface ChatAttachmentMutationScope {
  conversationScopeKey: string | null;
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
  isCurrentConversationScopeActive: () => boolean;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

interface UseChatAttachmentSendProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  editingMessageId: string | null;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
  mutationScope: ChatAttachmentMutationScope;
  isImagePendingFile: (pendingFile: PendingComposerFile) => boolean;
  isPdfPendingFile: (pendingFile: PendingComposerFile) => boolean;
  syncPersistedImagePreview: (context: {
    realMessage: ChatMessage;
    file: File;
  }) => Promise<void>;
  syncPersistedPdfPreview: (context: {
    realMessage: ChatMessage;
    pendingFile: PendingComposerFile;
  }) => Promise<void>;
}

export const useChatAttachmentSend = ({
  user,
  targetUser,
  currentChannelId,
  editingMessageId,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  pendingImagePreviewUrlsRef,
  registerPendingSend,
  mutationScope,
  isImagePendingFile,
  isPdfPendingFile,
  syncPersistedImagePreview,
  syncPersistedPdfPreview,
}: UseChatAttachmentSendProps) => {
  const {
    conversationScopeKey,
    isConversationScopeActive,
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
  } = mutationScope;
  const {
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  } = useChatAttachmentCleanup({
    setMessages,
    pendingImagePreviewUrlsRef,
    isConversationScopeActive,
  });

  const cleanupUncommittedStorageFiles = useCallback(
    async (
      storagePaths: Array<string | null | undefined>,
      options?: {
        toastMessage?: string;
        shouldToast?: boolean;
      }
    ) => {
      try {
        await deleteUploadedStorageFilesOrThrow(storagePaths);
        return true;
      } catch (cleanupError) {
        console.error('Error cleaning up uncommitted chat attachment:', {
          cleanupError,
          storagePaths,
        });

        if (
          options?.shouldToast &&
          options.toastMessage &&
          isCurrentConversationScopeActive()
        ) {
          toast.error(options.toastMessage, {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }

        return false;
      }
    },
    [deleteUploadedStorageFilesOrThrow, isCurrentConversationScopeActive]
  );

  const sendAttachmentMessage = useCallback(
    async (options: Parameters<typeof sendAttachmentThread>[1]) =>
      sendAttachmentThread(
        {
          user,
          targetUser,
          currentChannelId,
          editingMessageId,
          setMessages,
          scheduleScrollMessagesToBottom,
          triggerSendSuccessGlow,
          pendingImagePreviewUrlsRef,
          registerPendingSend,
          conversationScopeKey,
          isCurrentConversationScopeActive,
          reconcileCurrentConversationMessages,
          runInCurrentConversationScope,
          cleanupUncommittedStorageFiles,
          rollbackPersistedAttachmentThread,
          releasePendingPreviewUrl,
        },
        options
      ),
    [
      cleanupUncommittedStorageFiles,
      conversationScopeKey,
      currentChannelId,
      editingMessageId,
      isCurrentConversationScopeActive,
      pendingImagePreviewUrlsRef,
      reconcileCurrentConversationMessages,
      registerPendingSend,
      releasePendingPreviewUrl,
      rollbackPersistedAttachmentThread,
      runInCurrentConversationScope,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const handoffPendingImagePreview = useCallback(
    (tempMessageId: string, realMessageId: string) => {
      const previewUrl = pendingImagePreviewUrlsRef.current.get(tempMessageId);
      if (!previewUrl) {
        return;
      }

      pendingImagePreviewUrlsRef.current.delete(tempMessageId);
      chatRuntimeCache.imagePreviews.setEntry(realMessageId, {
        previewUrl,
        isObjectUrl: true,
      });
    },
    [pendingImagePreviewUrlsRef]
  );

  const seedLocalPdfPreviewCache = useCallback(
    (message: ChatMessage, pendingFile: PendingComposerFile) => {
      const pdfCoverUrl = pendingFile.pdfCoverUrl?.trim();
      if (!isPdfPendingFile(pendingFile) || !pdfCoverUrl) {
        return;
      }

      const cacheKey = buildPdfMessagePreviewCacheKey(
        {
          ...message,
          file_name: message.file_name ?? pendingFile.fileName,
          file_mime_type: message.file_mime_type ?? pendingFile.mimeType,
          file_size: message.file_size ?? pendingFile.file.size,
        },
        pendingFile.fileName
      );

      chatRuntimeCache.pdfPreviews.set(message.id, {
        cacheKey,
        coverDataUrl: pdfCoverUrl,
        pageCount: Math.max(pendingFile.pdfPageCount ?? 1, 1),
      });
    },
    [isPdfPendingFile]
  );

  const sendImageMessage = useCallback(
    async (file: File, captionText?: string): Promise<string | null> => {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      const imagePath = buildChatImagePath(currentChannelId, user.id, file);

      return sendAttachmentMessage({
        tempIdPrefix: 'temp_image',
        stableKeySuffix: 'image',
        file,
        captionText,
        sendFailureToast: 'Gagal mengirim gambar',
        captionFailureToast: 'Gagal mengirim deskripsi lampiran',
        buildOptimisticMessage: ({
          tempId,
          stableKey,
          localPreviewUrl,
          timestamp,
        }) => ({
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'image',
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        }),
        uploadAsset: async () =>
          chatSidebarAssetsGateway.uploadImage(file, imagePath),
        createPersistedMessage: async () =>
          chatSidebarMessagesGateway.createMessage({
            receiver_id: targetUser.id,
            message: imagePath,
            message_type: 'image',
            file_storage_path: imagePath,
          }),
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              file_storage_path: imagePath,
            },
            user,
            targetUser,
            stableKey
          ),
        onAfterCommit: async (
          realMessage,
          _stableKey,
          _uploadedPath,
          _scope,
          tempMessageId
        ) => {
          handoffPendingImagePreview(tempMessageId, realMessage.id);
          await syncPersistedImagePreview({
            realMessage: {
              ...realMessage,
              file_storage_path: realMessage.file_storage_path || imagePath,
              file_mime_type: realMessage.file_mime_type ?? file.type,
            },
            file,
          });
        },
      });
    },
    [
      currentChannelId,
      handoffPendingImagePreview,
      sendAttachmentMessage,
      syncPersistedImagePreview,
      targetUser,
      user,
    ]
  );

  const sendFileMessage = useCallback(
    async (
      pendingFile: PendingComposerFile,
      captionText?: string
    ): Promise<string | null> => {
      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      const filePath = buildChatFilePath(
        currentChannelId,
        user.id,
        pendingFile.file,
        pendingFile.fileKind
      );
      const sendFailureToast =
        pendingFile.fileKind === 'audio'
          ? 'Gagal mengirim audio'
          : 'Gagal mengirim dokumen';
      const shouldPersistImagePreview = isImagePendingFile(pendingFile);
      const shouldPersistPdfPreview = isPdfPendingFile(pendingFile);

      return sendAttachmentMessage({
        tempIdPrefix: 'temp_file',
        stableKeySuffix: 'file',
        file: pendingFile.file,
        captionText,
        sendFailureToast,
        captionFailureToast: 'Gagal mengirim deskripsi lampiran',
        buildOptimisticMessage: ({
          tempId,
          stableKey,
          localPreviewUrl,
          timestamp,
        }) => ({
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'file',
          file_name: pendingFile.fileName,
          file_kind: pendingFile.fileKind,
          file_mime_type: pendingFile.mimeType,
          file_size: pendingFile.file.size,
          file_storage_path: filePath,
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        }),
        onBeforeAppendOptimistic: optimisticMessage => {
          seedLocalPdfPreviewCache(optimisticMessage, pendingFile);
        },
        uploadAsset: async () =>
          chatSidebarAssetsGateway.uploadAttachment(
            pendingFile.file,
            filePath,
            pendingFile.mimeType || undefined
          ),
        createPersistedMessage: async () =>
          chatSidebarMessagesGateway.createMessage({
            receiver_id: targetUser.id,
            message: filePath,
            message_type: 'file',
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
          }),
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              file_name: pendingFile.fileName,
              file_kind: pendingFile.fileKind,
              file_mime_type: pendingFile.mimeType,
              file_size: pendingFile.file.size,
              file_storage_path: filePath,
            },
            user,
            targetUser,
            stableKey
          ),
        onAfterCommit: async (
          realMessage,
          _stableKey,
          _uploadedPath,
          _scope,
          tempMessageId
        ) => {
          if (shouldPersistImagePreview) {
            handoffPendingImagePreview(tempMessageId, realMessage.id);
            await syncPersistedImagePreview({
              realMessage: {
                ...realMessage,
                sender_id: user.id,
                file_name: pendingFile.fileName,
                file_mime_type: pendingFile.mimeType,
                file_storage_path: realMessage.file_storage_path || filePath,
              },
              file: pendingFile.file,
            });
          }

          if (!shouldPersistPdfPreview) {
            return;
          }

          seedLocalPdfPreviewCache(realMessage, pendingFile);
          await syncPersistedPdfPreview({
            realMessage: {
              ...realMessage,
              sender_id: user.id,
              file_name: pendingFile.fileName,
              file_mime_type: pendingFile.mimeType,
              file_storage_path: realMessage.file_storage_path || filePath,
            },
            pendingFile,
          });
        },
      });
    },
    [
      currentChannelId,
      handoffPendingImagePreview,
      isImagePendingFile,
      isPdfPendingFile,
      seedLocalPdfPreviewCache,
      sendAttachmentMessage,
      syncPersistedImagePreview,
      syncPersistedPdfPreview,
      targetUser,
      user,
    ]
  );

  return {
    sendImageMessage,
    sendFileMessage,
  };
};
