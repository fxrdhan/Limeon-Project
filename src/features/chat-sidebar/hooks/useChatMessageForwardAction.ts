import { useCallback, useMemo, useState } from 'react';
import { usePresenceRoster } from '@/hooks/presence/usePresenceRoster';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarCleanupGateway,
  chatSidebarMessagesGateway,
  chatSidebarPreviewGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import {
  buildChatFilePath,
  buildChatImagePath,
  getAttachmentFileKind,
  getAttachmentFileName,
} from '../utils/attachment';
import { computeDmChannelId } from '../utils/channel';
import {
  fetchChatFileBlobWithFallback,
  resolveFileExtension,
} from '../utils/message-file';
import {
  createPdfPreviewUploadArtifact,
  readBlobAsDataUrl,
} from '../utils/pdf-message-preview';
import { toAttachmentCaptionInsertInput } from '../utils/message-relations';

interface ForwardMessageDraft {
  message: ChatMessage;
  captionMessage: ChatMessage | null;
}

interface PreparedForwardAttachment {
  blob: Blob;
  fileKind: ReturnType<typeof getAttachmentFileKind>;
  fileName: string;
  isPdfDocument: boolean;
  mimeType: string;
}

interface UseChatMessageForwardActionProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  messages: ChatMessage[];
  closeMessageMenu: () => void;
  reconcileCurrentConversationMessages: () => Promise<void>;
}

const buildAttachmentCaptionSnapshot = (
  messages: ChatMessage[],
  targetMessage: ChatMessage
) =>
  messages.find(
    messageItem =>
      messageItem.reply_to_id === targetMessage.id &&
      messageItem.message_relation_kind === 'attachment_caption'
  ) ?? null;

const cleanupForwardedStoragePath = async (storagePath: string | null) => {
  if (!storagePath) {
    return;
  }

  try {
    const { data, error } = await chatSidebarCleanupGateway.cleanupStoragePaths(
      [storagePath]
    );

    if (error || data?.failedStoragePaths.length) {
      console.error('Failed to clean up forwarded storage path:', {
        error,
        failedStoragePaths: data?.failedStoragePaths,
        storagePath,
      });
    }
  } catch (error) {
    console.error('Failed to clean up forwarded storage path:', {
      error,
      storagePath,
    });
  }
};

const rollbackForwardedAttachmentThread = async (
  persistedMessageId: string,
  storagePath: string | null
) => {
  try {
    const { data, error } =
      await chatSidebarCleanupGateway.deleteMessageThreadAndCleanup(
        persistedMessageId
      );

    if (error) {
      throw error;
    }

    if (data?.failedStoragePaths.length) {
      console.error('Failed to roll back forwarded attachment thread:', {
        failedStoragePaths: data.failedStoragePaths,
        persistedMessageId,
      });
    }
  } catch (error) {
    console.error('Failed to roll back forwarded attachment thread:', {
      error,
      persistedMessageId,
    });
    await cleanupForwardedStoragePath(storagePath);
  }
};

const persistForwardedPdfPreview = async ({
  file,
  messageId,
}: {
  file: File;
  messageId: string;
}) => {
  try {
    const renderedPreview = await createPdfPreviewUploadArtifact(
      file,
      messageId
    );
    if (!renderedPreview) {
      return;
    }

    const previewDataUrl = await readBlobAsDataUrl(renderedPreview.previewFile);
    const previewPngBase64 = previewDataUrl.split(',')[1] ?? '';

    const { error } = await chatSidebarPreviewGateway.persistPdfPreview({
      message_id: messageId,
      preview_png_base64: previewPngBase64,
      page_count: renderedPreview.pageCount,
    });

    if (error) {
      console.error('Failed to persist forwarded PDF preview:', error);
    }
  } catch (error) {
    console.error('Failed to persist forwarded PDF preview:', error);
  }
};

export const useChatMessageForwardAction = ({
  user,
  targetUser,
  messages,
  closeMessageMenu,
  reconcileCurrentConversationMessages,
}: UseChatMessageForwardActionProps) => {
  const [forwardDraft, setForwardDraft] = useState<ForwardMessageDraft | null>(
    null
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    portalOrderedUsers,
    isDirectoryLoading,
    directoryError,
    hasMoreDirectoryUsers,
    retryLoadDirectory,
    loadMoreDirectoryUsers,
  } = usePresenceRoster(Boolean(forwardDraft));

  const availableRecipients = useMemo(
    () => portalOrderedUsers.filter(portalUser => portalUser.id !== user?.id),
    [portalOrderedUsers, user?.id]
  );

  const closeForwardPicker = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setForwardDraft(null);
    setSelectedRecipientIds(new Set());
  }, [isSubmitting]);

  const openForwardPicker = useCallback(
    (targetMessage: ChatMessage) => {
      closeMessageMenu();

      setForwardDraft({
        message: targetMessage,
        captionMessage: buildAttachmentCaptionSnapshot(messages, targetMessage),
      });
      setSelectedRecipientIds(new Set());
    },
    [closeMessageMenu, messages]
  );

  const toggleForwardRecipient = useCallback((recipientId: string) => {
    setSelectedRecipientIds(previousRecipientIds => {
      const nextRecipientIds = new Set(previousRecipientIds);
      if (nextRecipientIds.has(recipientId)) {
        nextRecipientIds.delete(recipientId);
      } else {
        nextRecipientIds.add(recipientId);
      }

      return nextRecipientIds;
    });
  }, []);

  const prepareForwardAttachment = useCallback(
    async (message: ChatMessage): Promise<PreparedForwardAttachment> => {
      const fileName = getAttachmentFileName(message);
      const blob = await fetchChatFileBlobWithFallback(
        message.message,
        message.file_storage_path,
        message.file_mime_type
      );

      if (!blob) {
        throw new Error('Attachment blob is unavailable');
      }

      const fallbackMimeType =
        message.message_type === 'image'
          ? 'image/jpeg'
          : 'application/octet-stream';
      const mimeType =
        message.file_mime_type?.trim() || blob.type || fallbackMimeType;
      const fileKind =
        message.message_type === 'file'
          ? getAttachmentFileKind(message)
          : 'document';
      const fileExtension = resolveFileExtension(
        fileName,
        message.message,
        mimeType
      );
      const isPdfDocument =
        message.message_type === 'file' &&
        fileKind === 'document' &&
        (fileExtension === 'pdf' || mimeType.toLowerCase().includes('pdf'));

      return {
        blob,
        fileKind,
        fileName,
        isPdfDocument,
        mimeType,
      };
    },
    []
  );

  const sendForwardedTextMessage = useCallback(
    async (recipientId: string, messageText: string) => {
      const { data, error } = await chatSidebarMessagesGateway.createMessage({
        receiver_id: recipientId,
        message: messageText,
        message_type: 'text',
      });

      if (error || !data) {
        throw error ?? new Error('Failed to create forwarded text message');
      }
    },
    []
  );

  const sendForwardedAttachmentThread = useCallback(
    async (
      recipient: { id: string },
      draft: ForwardMessageDraft,
      preparedAttachment: PreparedForwardAttachment
    ) => {
      if (!user) {
        throw new Error('Missing authenticated sender');
      }

      const channelId = computeDmChannelId(user.id, recipient.id);
      const file = new File(
        [preparedAttachment.blob],
        preparedAttachment.fileName,
        {
          type: preparedAttachment.mimeType,
          lastModified: Date.now(),
        }
      );
      const captionText = draft.captionMessage?.message.trim() || null;
      const isImageMessage = draft.message.message_type === 'image';
      const storagePath = isImageMessage
        ? buildChatImagePath(channelId, user.id, file)
        : buildChatFilePath(
            channelId,
            user.id,
            file,
            preparedAttachment.fileKind
          );
      let uploadedPath: string | null = null;

      uploadedPath = isImageMessage
        ? (await chatSidebarAssetsGateway.uploadImage(file, storagePath)).path
        : (
            await chatSidebarAssetsGateway.uploadAttachment(
              file,
              storagePath,
              preparedAttachment.mimeType
            )
          ).path;

      const { data: persistedMessage, error: persistedMessageError } =
        await chatSidebarMessagesGateway.createMessage(
          isImageMessage
            ? {
                receiver_id: recipient.id,
                message: uploadedPath,
                message_type: 'image',
                file_storage_path: uploadedPath,
              }
            : {
                receiver_id: recipient.id,
                message: uploadedPath,
                message_type: 'file',
                file_name: preparedAttachment.fileName,
                file_kind: preparedAttachment.fileKind,
                file_mime_type: preparedAttachment.mimeType,
                file_size: file.size,
                file_storage_path: uploadedPath,
              }
        );

      if (persistedMessageError || !persistedMessage) {
        await cleanupForwardedStoragePath(uploadedPath);
        throw (
          persistedMessageError ??
          new Error('Failed to create forwarded attachment message')
        );
      }

      if (preparedAttachment.isPdfDocument) {
        await persistForwardedPdfPreview({
          file,
          messageId: persistedMessage.id,
        });
      }

      if (!captionText) {
        return;
      }

      const { error: captionError } =
        await chatSidebarMessagesGateway.createMessage(
          toAttachmentCaptionInsertInput({
            receiver_id: recipient.id,
            message: captionText,
            message_type: 'text',
            reply_to_id: persistedMessage.id,
          })
        );

      if (captionError) {
        await rollbackForwardedAttachmentThread(
          persistedMessage.id,
          uploadedPath
        );
        throw captionError;
      }
    },
    [user]
  );

  const submitForwardMessage = useCallback(async () => {
    if (!forwardDraft || !user) {
      return;
    }

    const recipientIds = [...selectedRecipientIds];
    if (recipientIds.length === 0) {
      toast.error('Pilih minimal satu penerima', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    setIsSubmitting(true);

    const recipientsToSend = availableRecipients.filter(recipient =>
      selectedRecipientIds.has(recipient.id)
    );
    const preparedAttachment =
      forwardDraft.message.message_type === 'text'
        ? null
        : await prepareForwardAttachment(forwardDraft.message).catch(error => {
            console.error('Failed to prepare forwarded attachment:', error);
            toast.error('Lampiran tidak tersedia untuk diteruskan', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
            return null;
          });

    if (
      forwardDraft.message.message_type !== 'text' &&
      preparedAttachment === null
    ) {
      setIsSubmitting(false);
      return;
    }

    const successfulRecipientIds: string[] = [];
    const failedRecipientIds: string[] = [];

    try {
      for (const recipient of recipientsToSend) {
        try {
          if (forwardDraft.message.message_type === 'text') {
            await sendForwardedTextMessage(
              recipient.id,
              forwardDraft.message.message
            );
          } else {
            await sendForwardedAttachmentThread(
              recipient,
              forwardDraft,
              preparedAttachment!
            );
          }

          successfulRecipientIds.push(recipient.id);
        } catch (error) {
          console.error('Failed to forward message:', {
            error,
            recipientId: recipient.id,
            messageId: forwardDraft.message.id,
          });
          failedRecipientIds.push(recipient.id);
        }
      }

      if (targetUser?.id && successfulRecipientIds.includes(targetUser.id)) {
        await reconcileCurrentConversationMessages();
      }

      if (
        successfulRecipientIds.length > 0 &&
        failedRecipientIds.length === 0
      ) {
        toast.success(
          successfulRecipientIds.length === 1
            ? 'Pesan berhasil diteruskan'
            : `Pesan berhasil diteruskan ke ${successfulRecipientIds.length} pengguna`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        setForwardDraft(null);
        setSelectedRecipientIds(new Set());
        return;
      }

      if (successfulRecipientIds.length > 0) {
        toast.error(
          `${successfulRecipientIds.length} forward berhasil, ${failedRecipientIds.length} gagal`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        setSelectedRecipientIds(new Set(failedRecipientIds));
        return;
      }

      toast.error('Gagal meneruskan pesan', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    availableRecipients,
    forwardDraft,
    prepareForwardAttachment,
    reconcileCurrentConversationMessages,
    selectedRecipientIds,
    sendForwardedAttachmentThread,
    sendForwardedTextMessage,
    targetUser?.id,
    user,
  ]);

  return {
    isForwardPickerOpen: forwardDraft !== null,
    forwardTargetMessage: forwardDraft?.message ?? null,
    forwardCaptionMessage: forwardDraft?.captionMessage ?? null,
    availableForwardRecipients: availableRecipients,
    selectedForwardRecipientIds: selectedRecipientIds,
    isForwardDirectoryLoading: isDirectoryLoading,
    forwardDirectoryError: directoryError,
    hasMoreForwardDirectoryUsers: hasMoreDirectoryUsers,
    isSubmittingForwardMessage: isSubmitting,
    openForwardPicker,
    closeForwardPicker,
    toggleForwardRecipient,
    retryLoadForwardDirectory: retryLoadDirectory,
    loadMoreForwardDirectoryUsers: loadMoreDirectoryUsers,
    submitForwardMessage,
  };
};
