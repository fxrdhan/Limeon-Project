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
import {
  buildFailedAttachmentPreviewFields,
  buildReadyImagePreviewFields,
  buildReadyPdfPreviewFields,
  prepareImagePreviewPersistence,
  preparePdfPreviewPersistence,
} from '../utils/attachment-preview-persistence';
import { chatRuntime } from '../utils/chatRuntime';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import { sendAttachmentThread } from '../utils/attachment-thread-flow';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
  PendingComposerFile,
  PendingSendRegistration,
} from '../types';
import { useChatImagePreviewSync } from './useChatImagePreviewSync';
import { useChatPdfPreviewSync } from './useChatPdfPreviewSync';
import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';

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
}

export type SendableComposerAttachment =
  | AttachmentComposerRemoteFile
  | PendingComposerAttachment
  | PendingComposerFile;

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
}: UseChatAttachmentSendProps) => {
  const {
    conversationScopeKey,
    isConversationScopeActive,
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
  } = mutationScope;
  const { isPdfPendingFile, syncPersistedPdfPreview } = useChatPdfPreviewSync({
    isCurrentConversationScopeActive,
  });
  const { isImagePendingFile, syncPersistedImagePreview } =
    useChatImagePreviewSync({
      currentChannelId,
      isCurrentConversationScopeActive,
    });
  const {
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  } = useChatAttachmentCleanup({
    currentChannelId,
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

      chatRuntime.pdfPreviews.set(message.id, {
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
      const preparedImagePreview = await prepareImagePreviewPersistence(
        file,
        imagePath
      ).catch(error => {
        console.error('Error preparing chat image preview:', error);
        return null;
      });
      let imagePreviewFields = buildFailedAttachmentPreviewFields(
        'Thumbnail gambar tidak tersedia'
      );

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
        uploadAsset: async () => {
          const { path } = await chatSidebarAssetsGateway.uploadAttachment(
            file,
            imagePath,
            file.type || undefined
          );
          const additionalStoragePaths: string[] = [];

          if (preparedImagePreview) {
            try {
              const { path: previewPath } =
                await chatSidebarAssetsGateway.uploadAttachment(
                  preparedImagePreview.file,
                  preparedImagePreview.storagePath,
                  preparedImagePreview.file.type || undefined
                );

              additionalStoragePaths.push(previewPath);
              imagePreviewFields = buildReadyImagePreviewFields(previewPath);
            } catch (error) {
              console.error('Error uploading chat image preview:', error);
            }
          }

          return {
            path,
            additionalStoragePaths,
          };
        },
        createPersistedMessage: async () =>
          chatSidebarMessagesGateway.createMessage({
            receiver_id: targetUser.id,
            message: imagePath,
            message_type: 'image',
            file_storage_path: imagePath,
            ...imagePreviewFields,
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
          pendingImagePreviewUrlsRef.current.delete(tempMessageId);
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
      pendingImagePreviewUrlsRef,
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
      const preparedImagePreview = shouldPersistImagePreview
        ? await prepareImagePreviewPersistence(
            pendingFile.file,
            filePath
          ).catch(error => {
            console.error(
              'Error preparing chat document image preview:',
              error
            );
            return null;
          })
        : null;
      const preparedPdfPreview = shouldPersistPdfPreview
        ? await preparePdfPreviewPersistence(pendingFile.file, filePath).catch(
            error => {
              console.error('Error preparing chat PDF preview:', error);
              return null;
            }
          )
        : null;
      let filePreviewFields =
        shouldPersistImagePreview || shouldPersistPdfPreview
          ? buildFailedAttachmentPreviewFields(
              shouldPersistImagePreview
                ? 'Thumbnail gambar tidak tersedia'
                : 'Preview dokumen tidak tersedia'
            )
          : null;
      const resolvedPdfPendingFile =
        preparedPdfPreview &&
        (!pendingFile.pdfCoverUrl || !pendingFile.pdfPageCount)
          ? {
              ...pendingFile,
              pdfCoverUrl:
                pendingFile.pdfCoverUrl ?? preparedPdfPreview.coverDataUrl,
              pdfPageCount:
                pendingFile.pdfPageCount ?? preparedPdfPreview.pageCount,
            }
          : pendingFile;

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
          seedLocalPdfPreviewCache(optimisticMessage, resolvedPdfPendingFile);
        },
        uploadAsset: async () => {
          const { path } = await chatSidebarAssetsGateway.uploadAttachment(
            pendingFile.file,
            filePath,
            pendingFile.mimeType || undefined
          );
          const additionalStoragePaths: string[] = [];

          if (preparedImagePreview) {
            try {
              const { path: previewPath } =
                await chatSidebarAssetsGateway.uploadAttachment(
                  preparedImagePreview.file,
                  preparedImagePreview.storagePath,
                  preparedImagePreview.file.type || undefined
                );

              additionalStoragePaths.push(previewPath);
              filePreviewFields = buildReadyImagePreviewFields(previewPath);
            } catch (error) {
              console.error(
                'Error uploading chat document image preview:',
                error
              );
            }
          }

          if (preparedPdfPreview) {
            try {
              const { path: previewPath } =
                await chatSidebarAssetsGateway.uploadPdfPreview(
                  preparedPdfPreview.file,
                  preparedPdfPreview.storagePath
                );

              additionalStoragePaths.push(previewPath);
              filePreviewFields = buildReadyPdfPreviewFields(
                previewPath,
                preparedPdfPreview.pageCount
              );
            } catch (error) {
              console.error('Error uploading chat PDF preview:', error);
            }
          }

          return {
            path,
            additionalStoragePaths,
          };
        },
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
            ...filePreviewFields,
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
            pendingImagePreviewUrlsRef.current.delete(tempMessageId);
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

          seedLocalPdfPreviewCache(realMessage, resolvedPdfPendingFile);
          await syncPersistedPdfPreview({
            realMessage: {
              ...realMessage,
              sender_id: user.id,
              file_name: pendingFile.fileName,
              file_mime_type: pendingFile.mimeType,
              file_storage_path: realMessage.file_storage_path || filePath,
            },
            pendingFile: resolvedPdfPendingFile,
          });
        },
      });
    },
    [
      currentChannelId,
      isImagePendingFile,
      isPdfPendingFile,
      pendingImagePreviewUrlsRef,
      seedLocalPdfPreviewCache,
      sendAttachmentMessage,
      syncPersistedImagePreview,
      syncPersistedPdfPreview,
      targetUser,
      user,
    ]
  );

  const sendComposerAttachment = useCallback(
    async (
      attachment: SendableComposerAttachment,
      captionText?: string
    ): Promise<string | null> => {
      if (attachment.fileKind === 'image') {
        return sendImageMessage(attachment.file, captionText);
      }

      return sendFileMessage(attachment as PendingComposerFile, captionText);
    },
    [sendFileMessage, sendImageMessage]
  );

  return {
    sendComposerAttachment,
  };
};
