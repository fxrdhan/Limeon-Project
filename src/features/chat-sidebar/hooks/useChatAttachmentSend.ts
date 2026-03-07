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
import { mapConversationMessagesForDisplay } from '../utils/message-display';
import { commitOptimisticMessage } from '../utils/optimistic-message';
import { renderPdfPreviewBlob } from '../utils/pdf-preview';

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

const mapPersistedMessageForDisplay = (
  message: ChatMessage,
  user: { id: string; name: string },
  targetUser: ChatSidebarPanelTargetUser,
  stableKey: string
): ChatMessage => ({
  ...message,
  sender_name: user.name || 'You',
  receiver_name: targetUser.name || 'Unknown',
  stableKey,
});

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

      const mappedMessages = mapConversationMessagesForDisplay(latestMessages, {
        currentUserId: user.id,
        currentUserName: user.name || 'You',
        targetUserName: targetUser.name || 'Unknown',
      });

      setMessages(previousMessages => {
        const mappedMessageIds = new Set(
          mappedMessages.map(messageItem => messageItem.id)
        );
        const pendingMessages = previousMessages.filter(
          messageItem =>
            messageItem.id.startsWith('temp_') &&
            !mappedMessageIds.has(messageItem.id)
        );

        return [...mappedMessages, ...pendingMessages];
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

      const effectiveDeletedMessageIds =
        deletedMessageIds && deletedMessageIds.length > 0
          ? deletedMessageIds
          : [persistedMessageId];

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !effectiveDeletedMessageIds.includes(messageItem.id)
        )
      );

      effectiveDeletedMessageIds.forEach(messageId => {
        if (messageId.startsWith('temp_')) return;
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

  const sendImageMessage = useCallback(
    async (file: File, captionText?: string): Promise<string | null> => {
      if (!user || !targetUser || !currentChannelId) return null;

      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const tempId = `temp_image_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-image`;
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

      const optimisticMessage: ChatMessage = {
        id: tempId,
        sender_id: user.id,
        receiver_id: targetUser.id,
        channel_id: currentChannelId,
        message: localPreviewUrl,
        message_type: 'image',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: null,
        sender_name: user.name || 'You',
        receiver_name: targetUser.name || 'Unknown',
        stableKey,
      };

      const optimisticCaptionMessage: ChatMessage | null = hasAttachmentCaption
        ? {
            id: captionTempId!,
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedCaptionText,
            message_type: 'text',
            created_at: optimisticMessage.created_at,
            updated_at: optimisticMessage.updated_at,
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

      let uploadedImagePath: string | null = null;

      try {
        const imagePath = buildChatImagePath(currentChannelId, user.id, file);
        const { path, publicUrl } = await chatSidebarGateway.uploadImage(
          CHAT_IMAGE_BUCKET,
          file,
          imagePath
        );
        uploadedImagePath = path;

        if (pendingSend.isCancelled()) {
          await deleteUploadedStorageFiles([uploadedImagePath]);
          return null;
        }

        const { data: newMessage, error } =
          await chatSidebarGateway.createMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: publicUrl,
            message_type: 'image',
          });

        if (error || !newMessage) {
          if (!pendingSend.isCancelled()) {
            setMessages(previousMessages =>
              previousMessages.filter(
                messageItem => ![tempId, captionTempId].includes(messageItem.id)
              )
            );
          }
          await deleteUploadedStorageFiles([uploadedImagePath]);
          if (!pendingSend.isCancelled()) {
            toast.error('Gagal mengirim gambar', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return null;
        }

        const realMessage = mapPersistedMessageForDisplay(
          newMessage,
          user,
          targetUser,
          stableKey
        );

        if (pendingSend.isCancelled()) {
          try {
            await rollbackPersistedAttachmentThread(realMessage.id, [
              uploadedImagePath,
            ]);
            return null;
          } catch (rollbackError) {
            console.error(
              'Error cancelling temp image message after persistence:',
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
                  uploadedImagePath,
                ]);
                return null;
              } catch (rollbackError) {
                console.error(
                  'Error cancelling temp image thread after caption persistence:',
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
              setMessages(previousMessages =>
                previousMessages.filter(
                  messageItem =>
                    ![tempId, captionTempId].includes(messageItem.id)
                )
              );
            }

            try {
              await rollbackPersistedAttachmentThread(realMessage.id, [
                uploadedImagePath,
              ]);
            } catch (rollbackError) {
              console.error(
                'Error rolling back image attachment thread:',
                rollbackError
              );
              await reconcileConversationFromServer();
            }

            if (!pendingSend.isCancelled()) {
              toast.error('Gagal mengirim deskripsi lampiran', {
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

        return realMessage.id;
      } catch (error) {
        console.error('Error sending image message:', error);
        if (!pendingSend.isCancelled()) {
          setMessages(previousMessages =>
            previousMessages.filter(
              messageItem => ![tempId, captionTempId].includes(messageItem.id)
            )
          );
        }
        await deleteUploadedStorageFiles([uploadedImagePath]);
        if (!pendingSend.isCancelled()) {
          toast.error('Gagal mengirim gambar', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return null;
      } finally {
        pendingSend.complete();
        const previewUrl = pendingImagePreviewUrlsRef.current.get(tempId);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          pendingImagePreviewUrlsRef.current.delete(tempId);
        }
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
      rollbackPersistedAttachmentThread,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const sendFileMessage = useCallback(
    async (
      pendingFile: PendingComposerFile,
      captionText?: string
    ): Promise<string | null> => {
      if (!user || !targetUser || !currentChannelId) return null;

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const tempId = `temp_file_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-file`;
      const normalizedCaptionText = captionText?.trim() ?? '';
      const hasAttachmentCaption = normalizedCaptionText.length > 0;
      const captionTempId = hasAttachmentCaption
        ? `temp_caption_${Date.now()}`
        : null;
      const captionStableKey = hasAttachmentCaption
        ? `${stableKey}-caption`
        : null;
      const pendingSend = registerPendingSend(tempId);
      const filePath = buildChatFilePath(
        currentChannelId,
        user.id,
        pendingFile.file,
        pendingFile.fileKind
      );
      const isPdfDocument =
        pendingFile.fileKind === 'document' &&
        isPdfDocumentFile(pendingFile.fileName, pendingFile.mimeType);
      const localPreviewUrl = URL.createObjectURL(pendingFile.file);
      pendingImagePreviewUrlsRef.current.set(tempId, localPreviewUrl);

      const optimisticMessage: ChatMessage = {
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
        file_preview_status: isPdfDocument ? 'pending' : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: null,
        sender_name: user.name || 'You',
        receiver_name: targetUser.name || 'Unknown',
        stableKey,
      };

      const optimisticCaptionMessage: ChatMessage | null = hasAttachmentCaption
        ? {
            id: captionTempId!,
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedCaptionText,
            message_type: 'text',
            created_at: optimisticMessage.created_at,
            updated_at: optimisticMessage.updated_at,
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

      let uploadedFilePath: string | null = null;

      try {
        const { path, publicUrl } = await chatSidebarGateway.uploadAttachment(
          CHAT_IMAGE_BUCKET,
          pendingFile.file,
          filePath,
          pendingFile.mimeType || undefined
        );
        uploadedFilePath = path;

        if (pendingSend.isCancelled()) {
          await deleteUploadedStorageFiles([uploadedFilePath]);
          return null;
        }

        const { data: newMessage, error } =
          await chatSidebarGateway.createMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: publicUrl,
            message_type: 'file',
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            file_preview_status: isPdfDocument ? 'pending' : null,
          });

        if (error || !newMessage) {
          if (!pendingSend.isCancelled()) {
            setMessages(previousMessages =>
              previousMessages.filter(
                messageItem => ![tempId, captionTempId].includes(messageItem.id)
              )
            );
          }
          await deleteUploadedStorageFiles([uploadedFilePath]);
          if (!pendingSend.isCancelled()) {
            toast.error(
              pendingFile.fileKind === 'audio'
                ? 'Gagal mengirim audio'
                : 'Gagal mengirim dokumen',
              {
                toasterId: CHAT_SIDEBAR_TOASTER_ID,
              }
            );
          }
          return null;
        }

        const realMessage = mapPersistedMessageForDisplay(
          {
            ...newMessage,
            file_name: pendingFile.fileName,
            file_kind: pendingFile.fileKind,
            file_mime_type: pendingFile.mimeType,
            file_size: pendingFile.file.size,
            file_storage_path: filePath,
            file_preview_status: isPdfDocument ? 'pending' : null,
          },
          user,
          targetUser,
          stableKey
        );

        if (pendingSend.isCancelled()) {
          try {
            await rollbackPersistedAttachmentThread(realMessage.id, [
              uploadedFilePath,
            ]);
            return null;
          } catch (rollbackError) {
            console.error(
              'Error cancelling temp file message after persistence:',
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
                  uploadedFilePath,
                ]);
                return null;
              } catch (rollbackError) {
                console.error(
                  'Error cancelling temp file thread after caption persistence:',
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
              setMessages(previousMessages =>
                previousMessages.filter(
                  messageItem =>
                    ![tempId, captionTempId].includes(messageItem.id)
                )
              );
            }

            try {
              await rollbackPersistedAttachmentThread(realMessage.id, [
                uploadedFilePath,
              ]);
            } catch (rollbackError) {
              console.error(
                'Error rolling back file attachment thread:',
                rollbackError
              );
              await reconcileConversationFromServer();
            }

            if (!pendingSend.isCancelled()) {
              toast.error('Gagal mengirim deskripsi lampiran', {
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

        if (isPdfDocument) {
          void processPdfPreview(realMessage, pendingFile, filePath, stableKey);
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending file message:', error);
        if (!pendingSend.isCancelled()) {
          setMessages(previousMessages =>
            previousMessages.filter(
              messageItem => ![tempId, captionTempId].includes(messageItem.id)
            )
          );
        }
        await deleteUploadedStorageFiles([uploadedFilePath]);
        if (!pendingSend.isCancelled()) {
          toast.error(
            pendingFile.fileKind === 'audio'
              ? 'Gagal mengirim audio'
              : 'Gagal mengirim dokumen',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        }
        return null;
      } finally {
        pendingSend.complete();
        const previewUrl = pendingImagePreviewUrlsRef.current.get(tempId);
        if (previewUrl) {
          if (isPdfDocument) {
            window.setTimeout(() => {
              URL.revokeObjectURL(previewUrl);
            }, 30_000);
          } else {
            URL.revokeObjectURL(previewUrl);
          }
          pendingImagePreviewUrlsRef.current.delete(tempId);
        }
      }
    },
    [
      broadcastNewMessage,
      currentChannelId,
      deleteUploadedStorageFiles,
      editingMessageId,
      pendingImagePreviewUrlsRef,
      processPdfPreview,
      reconcileConversationFromServer,
      registerPendingSend,
      rollbackPersistedAttachmentThread,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  return {
    sendImageMessage,
    sendFileMessage,
  };
};
