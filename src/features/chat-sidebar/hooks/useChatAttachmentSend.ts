import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_IMAGE_BUCKET, CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser, PendingComposerFile } from '../types';
import { buildChatFilePath, buildChatImagePath } from '../utils/attachment';
import {
  getPersistedDeletedThreadMessageIds,
  resolveDeletedThreadMessageIds,
} from '../utils/message-thread';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import { getConversationScopeKey } from '../utils/conversation-scope';
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
import { useActiveConversationScope } from './useActiveConversationScope';
import { useChatAttachmentPdfPreview } from './useChatAttachmentPdfPreview';
import { useChatConversationReconciler } from './useChatConversationReconciler';

interface PendingSendRegistration {
  complete: () => void;
  isCancelled: () => boolean;
}

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
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
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

export const useChatAttachmentSend = ({
  user,
  targetUser,
  currentChannelId,
  editingMessageId,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  broadcastDeletedMessage,
  pendingImagePreviewUrlsRef,
  registerPendingSend,
}: UseChatAttachmentSendProps) => {
  const { isConversationScopeActive } = useActiveConversationScope({
    userId: user?.id,
    targetUserId: targetUser?.id,
    channelId: currentChannelId,
  });

  const deleteUploadedStorageFiles = useCallback(
    async (storagePaths: Array<string | null | undefined>) => {
      const uniquePaths = [...new Set(storagePaths)]
        .map(storagePath => storagePath?.trim() || null)
        .filter((storagePath): storagePath is string => Boolean(storagePath));

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
  const { processPdfPreview } = useChatAttachmentPdfPreview({
    user,
    targetUser,
    setMessages,
    broadcastUpdatedMessage,
    isConversationScopeActive,
    deleteUploadedStorageFiles,
  });

  const reconcileConversationFromServer = useChatConversationReconciler({
    user,
    targetUser,
    currentChannelId,
    setMessages,
    isConversationScopeActive,
  });

  const rollbackPersistedAttachmentThread = useCallback(
    async (
      persistedMessageId: string,
      storagePaths: Array<string | null | undefined>,
      conversationScopeKey: string | null
    ) => {
      const { data: deletedMessageIds, error } =
        await chatSidebarGateway.deleteMessageThread(persistedMessageId);

      if (error) {
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

      await deleteUploadedStorageFiles(storagePaths);
    },
    [
      broadcastDeletedMessage,
      deleteUploadedStorageFiles,
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

      const conversationScopeKey = getConversationScopeKey(
        user.id,
        targetUser.id,
        currentChannelId
      );
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
        const { path, publicUrl } = await uploadAsset();
        uploadedStoragePath = path;

        if (pendingSend.isCancelled()) {
          await deleteUploadedStorageFiles([uploadedStoragePath]);
          return null;
        }

        const { data: persistedMessage, error } = await createPersistedMessage(
          publicUrl,
          uploadedStoragePath
        );

        if (error || !persistedMessage) {
          if (
            !pendingSend.isCancelled() &&
            isConversationScopeActive(conversationScopeKey)
          ) {
            removeOptimisticAttachmentThreadFromState(tempId, captionTempId);
          }
          await deleteUploadedStorageFiles([uploadedStoragePath]);
          if (
            !pendingSend.isCancelled() &&
            isConversationScopeActive(conversationScopeKey)
          ) {
            toast.error(sendFailureToast, {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return null;
        }

        const realMessage = mapPersistedMessage(
          persistedMessage,
          uploadedStoragePath,
          stableKey
        );

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
          }
          return null;
        }

        if (hasAttachmentCaption && captionTempId) {
          const { data: captionMessage, error: captionError } =
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

          if (!captionError && captionMessage) {
            const mappedCaptionMessage = markMessageAsAttachmentCaption(
              mapPersistedMessageForDisplay(
                captionMessage,
                user,
                targetUser,
                captionStableKey!
              ),
              realMessage.id
            );

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
              }
              return null;
            }

            if (isConversationScopeActive(conversationScopeKey)) {
              setMessages(previousMessages =>
                commitOptimisticAttachmentThread({
                  previousMessages,
                  tempId,
                  realMessage,
                  captionTempId,
                  mappedCaptionMessage,
                })
              );

              broadcastNewMessage(realMessage);
              broadcastNewMessage(mappedCaptionMessage);
            }
          } else {
            if (
              !pendingSend.isCancelled() &&
              isConversationScopeActive(conversationScopeKey)
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
              await reconcileConversationFromServer({ conversationScopeKey });
            }

            if (
              !pendingSend.isCancelled() &&
              isConversationScopeActive(conversationScopeKey)
            ) {
              toast.error(captionFailureToast, {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
            return null;
          }
        } else {
          if (isConversationScopeActive(conversationScopeKey)) {
            setMessages(previousMessages =>
              commitOptimisticAttachmentThread({
                previousMessages,
                tempId,
                realMessage,
                captionTempId: null,
                mappedCaptionMessage: null,
              })
            );

            broadcastNewMessage(realMessage);
          }
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
        if (
          !pendingSend.isCancelled() &&
          isConversationScopeActive(conversationScopeKey)
        ) {
          removeOptimisticAttachmentThreadFromState(tempId, captionTempId);
        }
        await deleteUploadedStorageFiles([uploadedStoragePath]);
        if (
          !pendingSend.isCancelled() &&
          isConversationScopeActive(conversationScopeKey)
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
      broadcastNewMessage,
      currentChannelId,
      deleteUploadedStorageFiles,
      editingMessageId,
      isConversationScopeActive,
      pendingImagePreviewUrlsRef,
      registerPendingSend,
      releasePendingPreviewUrl,
      removeOptimisticAttachmentThreadFromState,
      rollbackPersistedAttachmentThread,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
      reconcileConversationFromServer,
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
        uploadAsset: async () => {
          const imagePath = buildChatImagePath(
            currentChannelId!,
            user!.id,
            file
          );
          return chatSidebarGateway.uploadImage(
            CHAT_IMAGE_BUCKET,
            file,
            imagePath
          );
        },
        createPersistedMessage: async publicUrl => {
          return chatSidebarGateway.createMessage({
            sender_id: user!.id,
            receiver_id: targetUser!.id,
            channel_id: currentChannelId!,
            message: publicUrl,
            message_type: 'image',
          });
        },
        mapPersistedMessage: (persistedMessage, _uploadedPath, stableKey) =>
          mapPersistedMessageForDisplay(
            persistedMessage,
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
        createPersistedMessage: async publicUrl =>
          chatSidebarGateway.createMessage({
            sender_id: user!.id,
            receiver_id: targetUser!.id,
            channel_id: currentChannelId!,
            message: publicUrl,
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
