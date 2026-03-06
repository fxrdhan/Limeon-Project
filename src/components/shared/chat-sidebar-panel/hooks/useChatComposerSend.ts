import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { StorageService } from '@/services/api/storage.service';
import { chatService, type ChatMessage } from '@/services/api/chat.service';
import { CHAT_IMAGE_BUCKET, CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
  PendingComposerFile,
} from '../types';
import { buildChatFilePath, buildChatImagePath } from '../utils/attachment';

type GeneratedPdfPreview = {
  coverBlob: Blob;
  pageCount: number;
};

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

interface UseChatComposerSendProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  editingMessageId: string | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
}

export const useChatComposerSend = ({
  user,
  targetUser,
  currentChannelId,
  message,
  setMessage,
  editingMessageId,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  pendingImagePreviewUrlsRef,
}: UseChatComposerSendProps) => {
  const handleSendImageMessage = useCallback(
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

      try {
        const imagePath = buildChatImagePath(currentChannelId, user.id, file);
        const { publicUrl } = await StorageService.uploadFile(
          CHAT_IMAGE_BUCKET,
          file,
          imagePath
        );

        const { data: newMessage, error } = await chatService.insertMessage({
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: publicUrl,
          message_type: 'image',
        });

        if (error || !newMessage) {
          setMessages(previousMessages =>
            previousMessages.filter(
              messageItem =>
                messageItem.id !== tempId &&
                (!captionTempId || messageItem.id !== captionTempId)
            )
          );
          toast.error('Gagal mengirim gambar', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return null;
        }

        const realMessage: ChatMessage = {
          ...newMessage,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === tempId ? realMessage : messageItem
          )
        );

        broadcastNewMessage(realMessage);

        if (hasAttachmentCaption && captionTempId) {
          const { data: captionMessage, error: captionError } =
            await chatService.insertMessage({
              sender_id: user.id,
              receiver_id: targetUser.id,
              channel_id: currentChannelId,
              message: normalizedCaptionText,
              message_type: 'text',
              reply_to_id: realMessage.id,
            });

          if (!captionError && captionMessage) {
            const mappedCaptionMessage: ChatMessage = {
              ...captionMessage,
              sender_name: user.name || 'You',
              receiver_name: targetUser.name || 'Unknown',
              stableKey: captionStableKey!,
            };

            setMessages(previousMessages =>
              previousMessages.map(messageItem =>
                messageItem.id === captionTempId
                  ? mappedCaptionMessage
                  : messageItem
              )
            );

            broadcastNewMessage(mappedCaptionMessage);
          } else {
            setMessages(previousMessages =>
              previousMessages.filter(
                messageItem => messageItem.id !== captionTempId
              )
            );
            toast.error('Gagal mengirim deskripsi lampiran', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending image message:', error);
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem =>
              messageItem.id !== tempId &&
              (!captionTempId || messageItem.id !== captionTempId)
          )
        );
        toast.error('Gagal mengirim gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      } finally {
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
      editingMessageId,
      pendingImagePreviewUrlsRef,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const generatePdfPreviewFromFile = useCallback(
    async (file: File): Promise<GeneratedPdfPreview | null> => {
      let pdfDocument: {
        numPages: number;
        getPage: (pageNumber: number) => Promise<any>;
        cleanup: () => void;
        destroy: () => void;
      } | null = null;

      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfWorkerModule =
          await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

        const fileBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(fileBuffer));
        const loadedPdfDocument = await loadingTask.promise;
        pdfDocument = loadedPdfDocument;

        const firstPage = await loadedPdfDocument.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        const targetWidth = 260;
        const scale = targetWidth / Math.max(baseViewport.width, 1);
        const viewport = firstPage.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;

        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));

        await firstPage.render({
          canvas,
          canvasContext: context,
          viewport,
          background: 'rgb(255, 255, 255)',
        }).promise;

        const coverBlob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(blob => {
            resolve(blob);
          }, 'image/png');
        });
        if (!coverBlob) return null;

        return {
          coverBlob,
          pageCount: Math.max(loadedPdfDocument.numPages ?? 1, 1),
        };
      } catch (error) {
        console.error('Error generating PDF preview from file:', error);
        return null;
      } finally {
        pdfDocument?.cleanup();
        pdfDocument?.destroy();
      }
    },
    []
  );

  const handleSendFileMessage = useCallback(
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

      try {
        const { publicUrl } = await StorageService.uploadRawFile(
          CHAT_IMAGE_BUCKET,
          pendingFile.file,
          filePath,
          pendingFile.mimeType || undefined
        );

        const { data: newMessage, error } = await chatService.insertMessage({
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
          setMessages(previousMessages =>
            previousMessages.filter(
              messageItem =>
                messageItem.id !== tempId &&
                (!captionTempId || messageItem.id !== captionTempId)
            )
          );
          toast.error(
            pendingFile.fileKind === 'audio'
              ? 'Gagal mengirim audio'
              : 'Gagal mengirim dokumen',
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
          return null;
        }

        const realMessage: ChatMessage = {
          ...newMessage,
          file_name: pendingFile.fileName,
          file_kind: pendingFile.fileKind,
          file_mime_type: pendingFile.mimeType,
          file_size: pendingFile.file.size,
          file_storage_path: filePath,
          file_preview_status: isPdfDocument ? 'pending' : null,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === tempId ? realMessage : messageItem
          )
        );

        broadcastNewMessage(realMessage);

        if (isPdfDocument) {
          void (async () => {
            const mergeAndBroadcastPreviewUpdate = (payload: ChatMessage) => {
              setMessages(previousMessages =>
                previousMessages.map(messageItem =>
                  messageItem.id === payload.id
                    ? { ...messageItem, ...payload }
                    : messageItem
                )
              );
              broadcastUpdatedMessage(payload);
            };

            const applyPreviewFailedState = async (
              errorMessage: string
            ): Promise<void> => {
              const { data: failedPreviewMessage, error: failedPreviewError } =
                await chatService.updateMessage(realMessage.id, {
                  file_preview_status: 'failed',
                  file_preview_error: errorMessage,
                });
              if (failedPreviewError || !failedPreviewMessage) return;

              const mappedFailedPreviewMessage: ChatMessage = {
                ...failedPreviewMessage,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey,
              };
              mergeAndBroadcastPreviewUpdate(mappedFailedPreviewMessage);
            };

            try {
              const generatedPreview = await generatePdfPreviewFromFile(
                pendingFile.file
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

              const { publicUrl: previewUrl } =
                await StorageService.uploadRawFile(
                  CHAT_IMAGE_BUCKET,
                  previewFile,
                  previewPath,
                  'image/png'
                );

              const { data: previewReadyMessage, error: previewReadyError } =
                await chatService.updateMessage(realMessage.id, {
                  file_preview_url: previewUrl,
                  file_preview_page_count: generatedPreview.pageCount,
                  file_preview_status: 'ready',
                  file_preview_error: null,
                });
              if (previewReadyError || !previewReadyMessage) return;

              const mappedPreviewReadyMessage: ChatMessage = {
                ...previewReadyMessage,
                sender_name: user.name || 'You',
                receiver_name: targetUser.name || 'Unknown',
                stableKey,
              };
              mergeAndBroadcastPreviewUpdate(mappedPreviewReadyMessage);
            } catch (error) {
              console.error('Error processing PDF preview metadata:', error);
              await applyPreviewFailedState('Gagal memproses preview PDF');
            }
          })();
        }

        if (hasAttachmentCaption && captionTempId) {
          const { data: captionMessage, error: captionError } =
            await chatService.insertMessage({
              sender_id: user.id,
              receiver_id: targetUser.id,
              channel_id: currentChannelId,
              message: normalizedCaptionText,
              message_type: 'text',
              reply_to_id: realMessage.id,
            });

          if (!captionError && captionMessage) {
            const mappedCaptionMessage: ChatMessage = {
              ...captionMessage,
              sender_name: user.name || 'You',
              receiver_name: targetUser.name || 'Unknown',
              stableKey: captionStableKey!,
            };

            setMessages(previousMessages =>
              previousMessages.map(messageItem =>
                messageItem.id === captionTempId
                  ? mappedCaptionMessage
                  : messageItem
              )
            );

            broadcastNewMessage(mappedCaptionMessage);
          } else {
            setMessages(previousMessages =>
              previousMessages.filter(
                messageItem => messageItem.id !== captionTempId
              )
            );
            toast.error('Gagal mengirim deskripsi lampiran', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
        }

        return realMessage.id;
      } catch (error) {
        console.error('Error sending file message:', error);
        setMessages(previousMessages =>
          previousMessages.filter(
            messageItem =>
              messageItem.id !== tempId &&
              (!captionTempId || messageItem.id !== captionTempId)
          )
        );
        toast.error(
          pendingFile.fileKind === 'audio'
            ? 'Gagal mengirim audio'
            : 'Gagal mengirim dokumen',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return null;
      } finally {
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
      broadcastUpdatedMessage,
      currentChannelId,
      editingMessageId,
      generatePdfPreviewFromFile,
      pendingImagePreviewUrlsRef,
      scheduleScrollMessagesToBottom,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const sendTextMessage = useCallback(
    async (messageText: string, replyToId?: string | null) => {
      if (!user || !targetUser || !currentChannelId) return false;
      if (!messageText.trim()) return false;

      const normalizedMessageText = messageText.trim();
      setMessage('');

      const tempId = `temp_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-${normalizedMessageText.slice(0, 10)}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        sender_id: user.id,
        receiver_id: targetUser.id,
        channel_id: currentChannelId,
        message: normalizedMessageText,
        message_type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: replyToId ?? null,
        sender_name: user.name || 'You',
        receiver_name: targetUser.name || 'Unknown',
        stableKey,
      };

      setMessages(previousMessages => [...previousMessages, optimisticMessage]);
      triggerSendSuccessGlow();
      scheduleScrollMessagesToBottom();

      try {
        const { data: newMessage, error } = await chatService.insertMessage({
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: normalizedMessageText,
          message_type: 'text',
          ...(replyToId ? { reply_to_id: replyToId } : {}),
        });

        if (error || !newMessage) {
          setMessages(previousMessages =>
            previousMessages.filter(messageItem => messageItem.id !== tempId)
          );
          setMessage(normalizedMessageText);
          return false;
        }

        const realMessage: ChatMessage = {
          ...newMessage,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === tempId ? realMessage : messageItem
          )
        );

        broadcastNewMessage(realMessage);

        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(previousMessages =>
          previousMessages.filter(messageItem => messageItem.id !== tempId)
        );
        setMessage(normalizedMessageText);
        return false;
      }
    },
    [
      broadcastNewMessage,
      currentChannelId,
      scheduleScrollMessagesToBottom,
      setMessage,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId) {
      return;
    }

    const hasPendingAttachments = pendingComposerAttachments.length > 0;
    const attachmentsToSend = [...pendingComposerAttachments];
    const messageText = message.trim();

    if (!hasPendingAttachments && !messageText) return;
    const shouldAttachCaption = hasPendingAttachments && messageText.length > 0;
    if (shouldAttachCaption) {
      setMessage('');
    }
    if (hasPendingAttachments) {
      clearPendingComposerAttachments();
    }

    let lastAttachmentMessageId: string | null = null;
    const lastAttachmentIndex = attachmentsToSend.length - 1;
    for (const [
      attachmentIndex,
      pendingAttachment,
    ] of attachmentsToSend.entries()) {
      const captionForAttachment =
        shouldAttachCaption && attachmentIndex === lastAttachmentIndex
          ? messageText
          : undefined;
      const sentAttachmentMessageId =
        pendingAttachment.fileKind === 'image'
          ? await handleSendImageMessage(
              pendingAttachment.file,
              captionForAttachment
            )
          : await handleSendFileMessage(
              {
                file: pendingAttachment.file,
                fileName: pendingAttachment.fileName,
                fileTypeLabel: pendingAttachment.fileTypeLabel,
                fileKind: pendingAttachment.fileKind,
                mimeType: pendingAttachment.mimeType,
              },
              captionForAttachment
            );

      if (!sentAttachmentMessageId) {
        if (shouldAttachCaption) {
          setMessage(messageText);
        }
        return;
      }

      lastAttachmentMessageId = sentAttachmentMessageId;
    }

    if (messageText && !shouldAttachCaption) {
      await sendTextMessage(
        messageText,
        hasPendingAttachments ? lastAttachmentMessageId : null
      );
    }
  }, [
    clearPendingComposerAttachments,
    editingMessageId,
    handleSendFileMessage,
    handleSendImageMessage,
    message,
    pendingComposerAttachments,
    sendTextMessage,
    setMessage,
  ]);

  const handleKeyPress = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return {
    handleSendMessage,
    handleKeyPress,
  };
};
