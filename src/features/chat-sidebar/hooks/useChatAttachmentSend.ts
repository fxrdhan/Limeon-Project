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
import { commitOptimisticMessage } from '../utils/optimistic-message';
import {
  getPersistedDeletedThreadMessageIds,
  resolveDeletedThreadMessageIds,
} from '../utils/message-thread';
import { renderPdfPreviewBlob } from '../utils/pdf-preview';
import {
  mapPersistedMessageForDisplay,
  reconcileConversationMessages,
} from '../utils/conversation-sync';

interface PendingSendRegistration {
  complete: () => void;
  isCancelled: () => boolean;
}

const isPdfDocumentFile = (fileName: string, mimeType: string) =>
  mimeType.toLowerCase().includes('pdf') ||
  fileName.toLowerCase().endsWith('.pdf');

const buildPdfPreviewStoragePath = (filePath: string) => {
  const normalizedPath = filePath.replace(/^documents\//, 'previews/');
  if (/\.[^./]+$/.test(normalizedPath)) {
    return normalizedPath.replace(/\.[^./]+$/, '.png');
  }

  return `${normalizedPath}.png`;
};

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
    uploadedPath: string
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

  const reconcileConversationFromServer = useCallback(async () => {
    if (!user || !targetUser || !currentChannelId) return;

    try {
      const { data: latestMessages, error } =
        await chatSidebarGateway.fetchConversationMessages(
          user.id,
          targetUser.id,
          currentChannelId
        );

      if (error || !latestMessages) {
        return;
      }

      reconcileConversationMessages({
        latestMessages,
        user,
        targetUser,
        setMessages,
      });
    } catch (error) {
      console.error(
        'Error reconciling conversation after send failure:',
        error
      );
    }
  }, [currentChannelId, setMessages, targetUser, user]);

  const rollbackPersistedAttachmentThread = useCallback(
    async (
      persistedMessageId: string,
      storagePaths: Array<string | null | undefined>
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

      await deleteUploadedStorageFiles(storagePaths);
    },
    [broadcastDeletedMessage, deleteUploadedStorageFiles, setMessages]
  );

  const mergeAndBroadcastPreviewUpdate = useCallback(
    (payload: ChatMessage) => {
      setMessages(previousMessages =>
        previousMessages.map(messageItem =>
          messageItem.id === payload.id
            ? { ...messageItem, ...payload }
            : messageItem
        )
      );
      broadcastUpdatedMessage(payload);
    },
    [broadcastUpdatedMessage, setMessages]
  );

  const processPdfPreview = useCallback(
    async (
      realMessage: ChatMessage,
      pendingFile: PendingComposerFile,
      filePath: string,
      stableKey: string
    ) => {
      if (!user || !targetUser) {
        return;
      }

      const applyPreviewFailedState = async (errorMessage: string) => {
        const { data: failedPreviewMessage, error: failedPreviewError } =
          await chatSidebarGateway.updateMessage(realMessage.id, {
            file_preview_status: 'failed',
            file_preview_error: errorMessage,
          });
        if (failedPreviewError || !failedPreviewMessage) return;

        mergeAndBroadcastPreviewUpdate(
          mapPersistedMessageForDisplay(
            failedPreviewMessage,
            user,
            targetUser,
            stableKey
          )
        );
      };

      let uploadedPreviewPath: string | null = null;

      try {
        const generatedPreview = await renderPdfPreviewBlob(
          pendingFile.file,
          260
        );
        if (!generatedPreview) {
          await applyPreviewFailedState('Gagal membuat preview PDF');
          return;
        }

        const previewPath = buildPdfPreviewStoragePath(filePath);
        const previewFileNameBase =
          pendingFile.fileName.replace(/\.[^./]+$/, '') || 'preview';
        const previewFile = new File(
          [generatedPreview.coverBlob],
          `${previewFileNameBase}.png`,
          { type: 'image/png' }
        );

        const { path: storedPreviewPath, publicUrl: previewUrl } =
          await chatSidebarGateway.uploadAttachment(
            CHAT_IMAGE_BUCKET,
            previewFile,
            previewPath,
            'image/png'
          );
        uploadedPreviewPath = storedPreviewPath;

        const { data: previewReadyMessage, error: previewReadyError } =
          await chatSidebarGateway.updateMessage(realMessage.id, {
            file_preview_url: previewUrl,
            file_preview_page_count: generatedPreview.pageCount,
            file_preview_status: 'ready',
            file_preview_error: null,
          });
        if (previewReadyError || !previewReadyMessage) {
          await deleteUploadedStorageFiles([uploadedPreviewPath]);
          await applyPreviewFailedState('Gagal menyimpan preview PDF');
          return;
        }

        mergeAndBroadcastPreviewUpdate(
          mapPersistedMessageForDisplay(
            previewReadyMessage,
            user,
            targetUser,
            stableKey
          )
        );
      } catch (error) {
        console.error('Error processing PDF preview metadata:', error);
        await deleteUploadedStorageFiles([uploadedPreviewPath]);
        await applyPreviewFailedState('Gagal memproses preview PDF');
      }
    },
    [
      deleteUploadedStorageFiles,
      mergeAndBroadcastPreviewUpdate,
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

  const removeOptimisticAttachmentThread = useCallback(
    (tempId: string, captionTempId: string | null) => {
      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => ![tempId, captionTempId].includes(messageItem.id)
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

      const timestamp = new Date().toISOString();
      const tempId = `${tempIdPrefix}_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-${stableKeySuffix}`;
      const normalizedCaptionText = captionText?.trim() ?? '';
      const hasAttachmentCaption = normalizedCaptionText.length > 0;
      const captionTempId = hasAttachmentCaption
        ? `temp_caption_${Date.now()}`
        : null;
      const captionStableKey = hasAttachmentCaption
        ? `${stableKey}-caption`
        : null;
      const pendingSend = registerPendingSend(tempId);
      const localPreviewUrl = URL.createObjectURL(file);
      pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);

      const optimisticMessage = buildOptimisticMessage({
        tempId,
        stableKey,
        localPreviewUrl,
        timestamp,
      });
      const optimisticCaptionMessage: ChatMessage | null = hasAttachmentCaption
        ? {
            id: captionTempId!,
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedCaptionText,
            message_type: 'text',
            created_at: timestamp,
            updated_at: timestamp,
            is_read: false,
            reply_to_id: tempId,
            sender_name: user.name || 'You',
            receiver_name: targetUser.name || 'Unknown',
            stableKey: captionStableKey!,
          }
        : null;

      setMessages(previousMessages =>
        optimisticCaptionMessage
          ? [...previousMessages, optimisticMessage, optimisticCaptionMessage]
          : [...previousMessages, optimisticMessage]
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
          if (!pendingSend.isCancelled()) {
            removeOptimisticAttachmentThread(tempId, captionTempId);
          }
          await deleteUploadedStorageFiles([uploadedStoragePath]);
          if (!pendingSend.isCancelled()) {
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
            await rollbackPersistedAttachmentThread(realMessage.id, [
              uploadedStoragePath,
            ]);
            return null;
          } catch (rollbackError) {
            console.error(
              'Error cancelling temp attachment thread after persistence:',
              rollbackError
            );
          }
        }

        if (hasAttachmentCaption && captionTempId) {
          const { data: captionMessage, error: captionError } =
            await chatSidebarGateway.createMessage({
              sender_id: user.id,
              receiver_id: targetUser.id,
              channel_id: currentChannelId,
              message: normalizedCaptionText,
              message_type: 'text',
              reply_to_id: realMessage.id,
            });

          if (!captionError && captionMessage) {
            const mappedCaptionMessage = mapPersistedMessageForDisplay(
              captionMessage,
              user,
              targetUser,
              captionStableKey!
            );

            if (pendingSend.isCancelled()) {
              try {
                await rollbackPersistedAttachmentThread(realMessage.id, [
                  uploadedStoragePath,
                ]);
                return null;
              } catch (rollbackError) {
                console.error(
                  'Error cancelling temp attachment thread after caption persistence:',
                  rollbackError
                );
              }
            }

            setMessages(previousMessages =>
              commitOptimisticMessage(
                commitOptimisticMessage(previousMessages, tempId, realMessage),
                captionTempId,
                mappedCaptionMessage
              )
            );

            broadcastNewMessage(realMessage);
            broadcastNewMessage(mappedCaptionMessage);
          } else {
            if (!pendingSend.isCancelled()) {
              removeOptimisticAttachmentThread(tempId, captionTempId);
            }

            try {
              await rollbackPersistedAttachmentThread(realMessage.id, [
                uploadedStoragePath,
              ]);
            } catch (rollbackError) {
              console.error(
                'Error rolling back attachment thread:',
                rollbackError
              );
              await reconcileConversationFromServer();
            }

            if (!pendingSend.isCancelled()) {
              toast.error(captionFailureToast, {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              });
            }
            return null;
          }
        } else {
          setMessages(previousMessages =>
            commitOptimisticMessage(previousMessages, tempId, realMessage)
          );

          broadcastNewMessage(realMessage);
        }

        if (uploadedStoragePath) {
          onAfterCommit?.(realMessage, stableKey, uploadedStoragePath);
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending attachment message:', error);
        if (!pendingSend.isCancelled()) {
          removeOptimisticAttachmentThread(tempId, captionTempId);
        }
        await deleteUploadedStorageFiles([uploadedStoragePath]);
        if (!pendingSend.isCancelled()) {
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
      pendingImagePreviewUrlsRef,
      reconcileConversationFromServer,
      registerPendingSend,
      releasePendingPreviewUrl,
      removeOptimisticAttachmentThread,
      rollbackPersistedAttachmentThread,
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
      const filePath = buildChatFilePath(
        currentChannelId!,
        user!.id,
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
        onAfterCommit: (realMessage, stableKey, uploadedPath) => {
          if (!isPdfDocument) {
            return;
          }

          void processPdfPreview(
            realMessage,
            pendingFile,
            uploadedPath,
            stableKey
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
