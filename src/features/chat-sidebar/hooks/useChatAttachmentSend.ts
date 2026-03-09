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
import { useChatAttachmentPdfPreview } from './useChatAttachmentPdfPreview';
import { useChatAttachmentThreadSend } from './useChatAttachmentThreadSend';

const isPdfDocumentFile = (fileName: string, mimeType: string) =>
  mimeType.toLowerCase().includes('pdf') ||
  fileName.toLowerCase().endsWith('.pdf');

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
  isConversationScopeActive: (conversationScopeKey: string | null) => boolean;
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
  isConversationScopeActive,
  isCurrentConversationScopeActive,
  reconcileCurrentConversationMessages,
  runInCurrentConversationScope,
  deleteUploadedStorageFilesOrThrow,
  rollbackPersistedAttachmentThread,
  releasePendingPreviewUrl,
}: UseChatAttachmentSendProps) => {
  const { processPdfPreview } = useChatAttachmentPdfPreview({
    user,
    targetUser,
    setMessages,
    isConversationScopeActive,
    deleteUploadedStorageFilesOrThrow,
  });
  const { sendAttachmentMessage } = useChatAttachmentThreadSend({
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
  });

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
          sender_id: user!.id,
          receiver_id: targetUser!.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'image',
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: null,
          sender_name: user!.name || 'You',
          receiver_name: targetUser!.name || 'Unknown',
          stableKey,
        }),
        uploadAsset: async () =>
          chatSidebarGateway.uploadImage(CHAT_IMAGE_BUCKET, file, imagePath),
        createPersistedMessage: async () => {
          return chatSidebarGateway.createMessage({
            sender_id: user!.id,
            receiver_id: targetUser!.id,
            channel_id: currentChannelId!,
            message: imagePath,
            message_type: 'image',
            file_storage_path: imagePath,
          });
        },
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              file_storage_path: imagePath,
            },
            user!,
            targetUser!,
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
      const isPdfDocument =
        pendingFile.fileKind === 'document' &&
        isPdfDocumentFile(pendingFile.fileName, pendingFile.mimeType);
      const sendFailureToast =
        pendingFile.fileKind === 'audio'
          ? 'Gagal mengirim audio'
          : 'Gagal mengirim dokumen';

      return sendAttachmentMessage({
        tempIdPrefix: 'temp_file',
        stableKeySuffix: 'file',
        file: pendingFile.file,
        captionText,
        sendFailureToast,
        captionFailureToast: 'Gagal mengirim deskripsi lampiran',
        shouldDelayPreviewCleanup: isPdfDocument,
        buildOptimisticMessage: ({
          tempId,
          stableKey,
          localPreviewUrl,
          timestamp,
        }) => ({
          id: tempId,
          sender_id: user!.id,
          receiver_id: targetUser!.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'file',
          file_name: pendingFile.fileName,
          file_kind: pendingFile.fileKind,
          file_mime_type: pendingFile.mimeType,
          file_size: pendingFile.file.size,
          file_storage_path: filePath,
          file_preview_status: isPdfDocument ? 'pending' : null,
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: null,
          sender_name: user!.name || 'You',
          receiver_name: targetUser!.name || 'Unknown',
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
            sender_id: user!.id,
            receiver_id: targetUser!.id,
            channel_id: currentChannelId!,
            message: filePath,
            message_type: 'file',
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            file_preview_status: isPdfDocument ? 'pending' : null,
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
              file_preview_status: isPdfDocument ? 'pending' : null,
            },
            user!,
            targetUser!,
            stableKey
          ),
        onAfterCommit: (
          realMessage,
          stableKey,
          uploadedPath,
          conversationScopeKey
        ) => {
          if (!isPdfDocument) {
            return;
          }

          void processPdfPreview(
            realMessage,
            pendingFile,
            uploadedPath,
            stableKey,
            conversationScopeKey
          );
        },
      });
    },
    [
      currentChannelId,
      processPdfPreview,
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
