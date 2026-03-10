import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_IMAGE_BUCKET, CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerFile,
  PendingSendRegistration,
} from '../types';
import { buildChatFilePath, buildChatImagePath } from '../utils/attachment';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import {
  sendAttachmentThread,
  type SendAttachmentOptions,
} from '../utils/attachment-thread-flow';
import { queuePersistedPdfPreview } from '../utils/pdf-preview-persistence';
import { resolveFileExtension } from '../utils/message-file';

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
  conversationScopeKey: string | null;
  isCurrentConversationScopeActive: () => boolean;
  reconcileCurrentConversationMessages: (options?: {
    fallbackMessages?: ChatMessage[];
  }) => Promise<void>;
  runInCurrentConversationScope: (effect: () => void) => boolean;
  deleteUploadedStorageFilesOrThrow: (
    storagePaths: Array<string | null | undefined>
  ) => Promise<void>;
  rollbackPersistedAttachmentThread: (
    persistedMessageId: string,
    storagePaths: Array<string | null | undefined>,
    conversationScopeKey: string | null
  ) => Promise<void>;
  releasePendingPreviewUrl: (
    tempId: string,
    shouldDelayCleanup?: boolean
  ) => void;
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
  conversationScopeKey,
  isCurrentConversationScopeActive,
  reconcileCurrentConversationMessages,
  runInCurrentConversationScope,
  deleteUploadedStorageFilesOrThrow,
  rollbackPersistedAttachmentThread,
  releasePendingPreviewUrl,
}: UseChatAttachmentSendProps) => {
  const isPdfPendingFile = useCallback((pendingFile: PendingComposerFile) => {
    if (pendingFile.fileKind !== 'document') {
      return false;
    }

    const fileExtension = resolveFileExtension(
      pendingFile.fileName,
      pendingFile.file.name,
      pendingFile.mimeType
    );

    return (
      fileExtension === 'pdf' ||
      pendingFile.mimeType.toLowerCase().includes('pdf')
    );
  }, []);

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
    async (options: SendAttachmentOptions): Promise<string | null> =>
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
          chatSidebarGateway.uploadImage(CHAT_IMAGE_BUCKET, file, imagePath),
        createPersistedMessage: async () =>
          chatSidebarGateway.createMessage({
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
      });
    },
    [currentChannelId, sendAttachmentMessage, targetUser, user]
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
        uploadAsset: async () =>
          chatSidebarGateway.uploadAttachment(
            CHAT_IMAGE_BUCKET,
            pendingFile.file,
            filePath,
            pendingFile.mimeType || undefined
          ),
        createPersistedMessage: async () =>
          chatSidebarGateway.createMessage({
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
        onAfterCommit: shouldPersistPdfPreview
          ? realMessage => {
              queuePersistedPdfPreview({
                message: {
                  ...realMessage,
                  file_name: pendingFile.fileName,
                  file_mime_type: pendingFile.mimeType,
                  file_storage_path: realMessage.file_storage_path || filePath,
                },
                file: pendingFile.file,
              });
            }
          : undefined,
      });
    },
    [
      currentChannelId,
      isPdfPendingFile,
      sendAttachmentMessage,
      targetUser,
      user,
    ]
  );

  return {
    sendImageMessage,
    sendFileMessage,
  };
};
