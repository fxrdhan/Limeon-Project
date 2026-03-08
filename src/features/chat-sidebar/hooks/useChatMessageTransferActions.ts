import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { getAttachmentFileName } from '../utils/attachment';
import { getClipboardImagePayload } from '../utils/clipboard';
import { fetchChatFileBlobWithFallback } from '../utils/message-file';

export const useChatMessageTransferActions = ({
  closeMessageMenu,
}: {
  closeMessageMenu: () => void;
}) => {
  const buildCopyableMessageText = useCallback((targetMessage: ChatMessage) => {
    if (targetMessage.message_type === 'file') {
      return `[File: ${getAttachmentFileName(targetMessage)}] ${targetMessage.message}`;
    }

    return targetMessage.message;
  }, []);

  const handleCopyMessage = useCallback(
    async (targetMessage: ChatMessage) => {
      closeMessageMenu();

      if (targetMessage.message_type === 'image') {
        try {
          await toast.promise(
            (async () => {
              const clipboardWithWrite = navigator.clipboard as Clipboard & {
                write?: (items: ClipboardItem[]) => Promise<void>;
              };
              const writeImageToClipboard = clipboardWithWrite.write?.bind(
                navigator.clipboard
              );
              const canCopyBinaryImage =
                typeof ClipboardItem !== 'undefined' &&
                typeof writeImageToClipboard === 'function';

              if (!canCopyBinaryImage) {
                throw new Error('Clipboard image write is not supported');
              }

              const imageBlob = await fetchChatFileBlobWithFallback(
                targetMessage.message,
                targetMessage.file_storage_path,
                targetMessage.file_mime_type
              );
              if (!imageBlob) {
                throw new Error('Failed to fetch image for clipboard');
              }

              const clipboardPayload =
                await getClipboardImagePayload(imageBlob);
              await writeImageToClipboard([
                new ClipboardItem({
                  [clipboardPayload.mimeType]: clipboardPayload.blob,
                }),
              ]);
            })(),
            {
              loading: 'Menyalin gambar...',
              success: 'Gambar berhasil disalin',
              error: 'Gagal menyalin gambar ke clipboard',
            },
            {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            }
          );
        } catch (error) {
          console.error('Error copying message:', error);
        }

        return;
      }

      try {
        await navigator.clipboard.writeText(
          buildCopyableMessageText(targetMessage)
        );
        toast.success(
          targetMessage.message_type === 'file'
            ? 'Lampiran berhasil disalin'
            : 'Pesan berhasil disalin',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        console.error('Error copying message:', error);
        toast.error(
          targetMessage.message_type === 'file'
            ? 'Gagal menyalin lampiran'
            : 'Gagal menyalin pesan',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      }
    },
    [buildCopyableMessageText, closeMessageMenu]
  );

  const handleDownloadMessage = useCallback(
    async (targetMessage: ChatMessage) => {
      const fileUrl = targetMessage.message;
      const fileName = getAttachmentFileName(targetMessage);

      if (!fileUrl) {
        toast.error('File tidak tersedia untuk diunduh', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        closeMessageMenu();
        return;
      }

      try {
        await toast.promise(
          (async () => {
            const fileBlob = await fetchChatFileBlobWithFallback(
              fileUrl,
              targetMessage.file_storage_path
            );
            if (!fileBlob) {
              throw new Error('Failed to fetch file for download');
            }

            const objectUrl = URL.createObjectURL(fileBlob);
            const link = document.createElement('a');

            link.href = objectUrl;
            link.download = fileName;
            link.rel = 'noreferrer';
            document.body.append(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
            }, 1500);
          })(),
          {
            loading: 'Menyiapkan unduhan...',
            success: 'Unduhan dimulai',
            error: 'Gagal mengunduh file',
          },
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        console.error('Error downloading file:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu]
  );

  return {
    handleCopyMessage,
    handleDownloadMessage,
  };
};
