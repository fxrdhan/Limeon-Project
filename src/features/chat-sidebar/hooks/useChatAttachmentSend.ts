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
  markMessageAsAttachmentCaption,
  toAttachmentCaptionInsertInput,
} from '../utils/message-relations';
import {
  appendOptimisticAttachmentThread,
  commitOptimisticAttachmentThread,
  createOptimisticAttachmentThread,
  removeOptimisticAttachmentThread,
} from '../utils/attachment-send';
import { useChatAttachmentPdfPreview } from './useChatAttachmentPdfPreview';

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

interface SendAttachmentOptions {
  tempIdPrefix: string;
  stableKeySuffix: string;
  file: File;
  captionText?: string;
  sendFailureToast: string;
  captionFailureToast: string;
  shouldDelayPreviewCleanup?: boolean;
  buildOptimisticMessage: (context: {
    tempId: string;
    stableKey: string;
    localPreviewUrl: string;
    timestamp: string;
  }) => ChatMessage;
  uploadAsset: () => Promise<{ path: string; publicUrl: string }>;
  createPersistedMessage: (
    publicUrl: string,
    uploadedPath: string
  ) => Promise<{ data: ChatMessage | null; error: unknown }>;
  mapPersistedMessage: (
    persistedMessage: ChatMessage,
    uploadedPath: string,
    stableKey: string
  ) => ChatMessage;
  onAfterCommit?: (
    realMessage: ChatMessage,
    stableKey: string,
    uploadedPath: string,
    conversationScopeKey: string | null
  ) => void;
}

interface PersistedAttachmentResult {
  uploadedStoragePath: string;
  realMessage: ChatMessage | null;
  error: unknown;
}

interface PersistedAttachmentCaptionResult {
  mappedCaptionMessage: ChatMessage | null;
  error: unknown;
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

  const removeOptimisticAttachmentThreadFromState = useCallback(
    (tempId: string, captionTempId: string | null) => {
      setMessages(previousMessages =>
        removeOptimisticAttachmentThread(
          previousMessages,
          tempId,
          captionTempId
        )
      );
    },
    [setMessages]
  );

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

  const persistAttachmentMessage = useCallback(
    async ({
      uploadAsset,
      createPersistedMessage,
      mapPersistedMessage,
      stableKey,
    }: Pick<
      SendAttachmentOptions,
      'uploadAsset' | 'createPersistedMessage' | 'mapPersistedMessage'
    > & {
      stableKey: string;
    }): Promise<PersistedAttachmentResult> => {
      const { path: uploadedStoragePath, publicUrl } = await uploadAsset();
      const { data: persistedMessage, error } = await createPersistedMessage(
        publicUrl,
        uploadedStoragePath
      );

      if (error || !persistedMessage) {
        return {
          uploadedStoragePath,
          realMessage: null,
          error,
        };
      }

      return {
        uploadedStoragePath,
        realMessage: mapPersistedMessage(
          persistedMessage,
          uploadedStoragePath,
          stableKey
        ),
        error: null,
      };
    },
    []
  );

  const persistAttachmentCaptionMessage = useCallback(
    async ({
      realMessage,
      normalizedCaptionText,
      captionStableKey,
    }: {
      realMessage: ChatMessage;
      normalizedCaptionText: string;
      captionStableKey: string;
    }): Promise<PersistedAttachmentCaptionResult> => {
      if (!user || !targetUser || !currentChannelId) {
        return {
          mappedCaptionMessage: null,
          error: new Error('Missing active chat participants'),
        };
      }

      const { data: captionMessage, error } =
        await chatSidebarGateway.createMessage(
          toAttachmentCaptionInsertInput({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedCaptionText,
            message_type: 'text',
            reply_to_id: realMessage.id,
          })
        );

      if (error || !captionMessage) {
        return {
          mappedCaptionMessage: null,
          error,
        };
      }

      return {
        mappedCaptionMessage: markMessageAsAttachmentCaption(
          mapPersistedMessageForDisplay(
            captionMessage,
            user,
            targetUser,
            captionStableKey
          ),
          realMessage.id
        ),
        error: null,
      };
    },
    [currentChannelId, targetUser, user]
  );

  const commitAttachmentThreadInScope = useCallback(
    ({
      tempId,
      realMessage,
      captionTempId,
      mappedCaptionMessage,
    }: {
      tempId: string;
      realMessage: ChatMessage;
      captionTempId: string | null;
      mappedCaptionMessage?: ChatMessage | null;
    }) => {
      runInCurrentConversationScope(() => {
        setMessages(previousMessages =>
          commitOptimisticAttachmentThread({
            previousMessages,
            tempId,
            realMessage,
            captionTempId,
            mappedCaptionMessage,
          })
        );
      });
    },
    [runInCurrentConversationScope, setMessages]
  );

  const sendAttachmentMessage = useCallback(
    async ({
      tempIdPrefix,
      stableKeySuffix,
      file,
      captionText,
      sendFailureToast,
      captionFailureToast,
      shouldDelayPreviewCleanup = false,
      buildOptimisticMessage,
      uploadAsset,
      createPersistedMessage,
      mapPersistedMessage,
      onAfterCommit,
    }: SendAttachmentOptions): Promise<string | null> => {
      if (!user || !targetUser || !currentChannelId) {
        return null;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const timestamp = new Date().toISOString();
      const localPreviewUrl = URL.createObjectURL(file);
      const optimisticThread = createOptimisticAttachmentThread({
        tempIdPrefix,
        stableKeySuffix,
        captionText,
        currentChannelId,
        localPreviewUrl,
        timestamp,
        user,
        targetUser,
        buildOptimisticMessage,
      });
      const {
        tempId,
        stableKey,
        normalizedCaptionText,
        hasAttachmentCaption,
        captionTempId,
        captionStableKey,
      } = optimisticThread;
      const pendingSend = registerPendingSend(tempId);
      pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);

      setMessages(previousMessages =>
        appendOptimisticAttachmentThread(previousMessages, optimisticThread)
      );
      triggerSendSuccessGlow();
      scheduleScrollMessagesToBottom();

      let uploadedStoragePath: string | null = null;

      try {
        const persistedAttachment = await persistAttachmentMessage({
          uploadAsset,
          createPersistedMessage,
          mapPersistedMessage,
          stableKey,
        });
        uploadedStoragePath = persistedAttachment.uploadedStoragePath;

        if (!persistedAttachment.realMessage || persistedAttachment.error) {
          if (pendingSend.isCancelled()) {
            await cleanupUncommittedStorageFiles([uploadedStoragePath]);
            return null;
          }

          if (
            !pendingSend.isCancelled() &&
            isCurrentConversationScopeActive()
          ) {
            removeOptimisticAttachmentThreadFromState(tempId, captionTempId);
          }
          const didCleanupStorage = await cleanupUncommittedStorageFiles(
            [uploadedStoragePath],
            {
              toastMessage:
                'Pengiriman gagal dan file sementara tidak dapat dibersihkan',
              shouldToast: !pendingSend.isCancelled(),
            }
          );
          if (
            didCleanupStorage &&
            !pendingSend.isCancelled() &&
            isCurrentConversationScopeActive()
          ) {
            toast.error(sendFailureToast, {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return null;
        }

        const realMessage = persistedAttachment.realMessage;

        if (pendingSend.isCancelled()) {
          try {
            await rollbackPersistedAttachmentThread(
              realMessage.id,
              [uploadedStoragePath],
              conversationScopeKey
            );
          } catch (rollbackError) {
            console.error(
              'Error cancelling temp attachment thread after persistence:',
              rollbackError
            );
            await reconcileCurrentConversationMessages();
          }
          return null;
        }

        if (hasAttachmentCaption && captionTempId) {
          const persistedCaption = await persistAttachmentCaptionMessage({
            realMessage,
            normalizedCaptionText,
            captionStableKey: captionStableKey!,
          });

          if (
            !persistedCaption.error &&
            persistedCaption.mappedCaptionMessage
          ) {
            if (pendingSend.isCancelled()) {
              try {
                await rollbackPersistedAttachmentThread(
                  realMessage.id,
                  [uploadedStoragePath],
                  conversationScopeKey
                );
              } catch (rollbackError) {
                console.error(
                  'Error cancelling temp attachment thread after caption persistence:',
                  rollbackError
                );
                await reconcileCurrentConversationMessages();
              }
              return null;
            }

            commitAttachmentThreadInScope({
              tempId,
              realMessage,
              captionTempId,
              mappedCaptionMessage: persistedCaption.mappedCaptionMessage,
            });
          } else {
            if (
              !pendingSend.isCancelled() &&
              isCurrentConversationScopeActive()
            ) {
              removeOptimisticAttachmentThreadFromState(tempId, captionTempId);
            }

            try {
              await rollbackPersistedAttachmentThread(
                realMessage.id,
                [uploadedStoragePath],
                conversationScopeKey
              );
            } catch (rollbackError) {
              console.error(
                'Error rolling back attachment thread:',
                rollbackError
              );
              await reconcileCurrentConversationMessages();
            }

            if (
              !pendingSend.isCancelled() &&
              isCurrentConversationScopeActive()
            ) {
              toast.error(captionFailureToast, {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
            return null;
          }
        } else {
          commitAttachmentThreadInScope({
            tempId,
            realMessage,
            captionTempId: null,
            mappedCaptionMessage: null,
          });
        }

        if (uploadedStoragePath) {
          onAfterCommit?.(
            realMessage,
            stableKey,
            uploadedStoragePath,
            conversationScopeKey
          );
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending attachment message:', error);
        if (!pendingSend.isCancelled() && isCurrentConversationScopeActive()) {
          removeOptimisticAttachmentThreadFromState(tempId, captionTempId);
        }
        const didCleanupStorage = await cleanupUncommittedStorageFiles(
          [uploadedStoragePath],
          {
            toastMessage:
              'Pengiriman gagal dan file sementara tidak dapat dibersihkan',
            shouldToast: !pendingSend.isCancelled(),
          }
        );
        if (
          didCleanupStorage &&
          !pendingSend.isCancelled() &&
          isCurrentConversationScopeActive()
        ) {
          toast.error(sendFailureToast, {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return null;
      } finally {
        pendingSend.complete();
        releasePendingPreviewUrl(tempId, shouldDelayPreviewCleanup);
      }
    },
    [
      commitAttachmentThreadInScope,
      conversationScopeKey,
      cleanupUncommittedStorageFiles,
      currentChannelId,
      editingMessageId,
      isCurrentConversationScopeActive,
      pendingImagePreviewUrlsRef,
      persistAttachmentCaptionMessage,
      persistAttachmentMessage,
      registerPendingSend,
      releasePendingPreviewUrl,
      removeOptimisticAttachmentThreadFromState,
      rollbackPersistedAttachmentThread,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
      reconcileCurrentConversationMessages,
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
