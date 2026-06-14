import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatAttachmentCleanup } from './useChatAttachmentCleanup';
import { buildChatFilePath } from '../utils/attachment';
import {
  buildReadyImagePreviewFields,
  buildReadyPdfPreviewFields,
  prepareImagePreviewPersistence,
  preparePdfPreviewPersistence,
} from '../utils/attachment-preview-persistence';
import { chatRuntime } from '../utils/chatRuntime';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';
import type { PreparedComposerAttachmentOptimisticState } from '../utils/attachment-send';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
  PendingComposerFile,
  PendingSendRegistration,
} from '../types';
import { useChatImagePreviewSync } from './useChatImagePreviewSync';
import { useChatPdfPreviewSync } from './useChatPdfPreviewSync';
import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';
import { useAttachmentMessageTransaction } from './useAttachmentMessageTransaction';
import { useChatImageAttachmentSender } from './useChatImageAttachmentSender';
import {
  buildFileAttachmentMetadata,
  buildFilePreviewSyncMessage,
  buildInitialFilePreviewFields,
  getFileAttachmentSendFailureToast,
  resolvePendingFileWithPreparedPdfPreview,
} from './chatAttachmentFileSendPlan';

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
  replyingMessageId?: string | null;
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
  replyingMessageId = null,
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

  const sendAttachmentMessage = useAttachmentMessageTransaction({
    user,
    targetUser,
    currentChannelId,
    editingMessageId,
    replyingMessageId,
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

  const sendImageMessage = useChatImageAttachmentSender({
    user,
    targetUser,
    currentChannelId,
    pendingImagePreviewUrlsRef,
    sendAttachmentMessage,
    syncPersistedImagePreview,
  });

  const sendFileMessage = useCallback(
    async (
      pendingFile: PendingComposerFile,
      captionText?: string,
      replyToId?: string | null,
      options?: {
        optimistic?: PreparedComposerAttachmentOptimisticState;
      }
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
      const fileAttachmentMetadata = buildFileAttachmentMetadata(
        pendingFile,
        filePath
      );
      const sendFailureToast = getFileAttachmentSendFailureToast(
        pendingFile.fileKind
      );
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
      let filePreviewFields = buildInitialFilePreviewFields({
        shouldPersistImagePreview,
        shouldPersistPdfPreview,
      });
      const resolvedPdfPendingFile = resolvePendingFileWithPreparedPdfPreview(
        pendingFile,
        preparedPdfPreview
      );

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
          replyToId: optimisticReplyToId,
        }) => ({
          id: tempId,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: localPreviewUrl,
          message_type: 'file',
          ...fileAttachmentMetadata,
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: optimisticReplyToId ?? null,
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
            reply_to_id: replyToId ?? undefined,
            ...fileAttachmentMetadata,
            ...filePreviewFields,
          }),
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            {
              ...persistedMessage,
              ...fileAttachmentMetadata,
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
              realMessage: buildFilePreviewSyncMessage({
                realMessage,
                pendingFile,
                filePath,
                senderId: user.id,
              }),
              file: pendingFile.file,
            });
          }

          if (!shouldPersistPdfPreview) {
            return;
          }

          seedLocalPdfPreviewCache(realMessage, resolvedPdfPendingFile);
          await syncPersistedPdfPreview({
            realMessage: buildFilePreviewSyncMessage({
              realMessage,
              pendingFile,
              filePath,
              senderId: user.id,
            }),
            pendingFile: resolvedPdfPendingFile,
          });
        },
        optimistic: options?.optimistic,
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
      captionText?: string,
      replyToId?: string | null,
      options?: {
        optimistic?: PreparedComposerAttachmentOptimisticState;
      }
    ): Promise<string | null> => {
      if (attachment.fileKind === 'image') {
        return sendImageMessage(
          attachment.file,
          captionText,
          replyToId,
          options
        );
      }

      return sendFileMessage(
        attachment as PendingComposerFile,
        captionText,
        replyToId,
        options
      );
    },
    [sendFileMessage, sendImageMessage]
  );

  return {
    sendComposerAttachment,
  };
};
