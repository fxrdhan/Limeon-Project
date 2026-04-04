import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  getAttachmentFileName,
  getChatAttachmentGroupZipFileName,
  getChatDownloadFileName,
} from '../utils/attachment';
import { getClipboardImagePayload } from '../utils/clipboard';
import { fetchChatFileBlobWithFallback } from '../utils/message-file';
import { buildZipBlob } from '../utils/zip';

export const useChatMessageTransferActions = ({
  closeMessageMenu,
}: {
  closeMessageMenu: () => void;
}) => {
  const triggerBlobDownload = useCallback(
    (fileBlob: Blob, fileName: string) => {
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
    },
    []
  );

  const buildCopyableMessageText = useCallback((targetMessage: ChatMessage) => {
    if (targetMessage.message_type === 'file') {
      return `[File: ${getAttachmentFileName(targetMessage)}]`;
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
      const fileName = getChatDownloadFileName(targetMessage);

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

            triggerBlobDownload(fileBlob, fileName);
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
    [closeMessageMenu, triggerBlobDownload]
  );

  const handleDownloadImageGroup = useCallback(
    async (targetMessages: ChatMessage[]) => {
      if (targetMessages.length === 0) {
        closeMessageMenu();
        return;
      }

      try {
        await toast.promise(
          (async () => {
            const zipEntries = await Promise.all(
              targetMessages.map(async targetMessage => {
                const fileBlob = await fetchChatFileBlobWithFallback(
                  targetMessage.message,
                  targetMessage.file_storage_path,
                  targetMessage.file_mime_type
                );

                if (!fileBlob) {
                  throw new Error(
                    `Failed to fetch image for group download: ${targetMessage.id}`
                  );
                }

                return {
                  blob: fileBlob,
                  fileName: getChatDownloadFileName(targetMessage),
                };
              })
            );
            const zipBlob = await buildZipBlob(zipEntries);

            triggerBlobDownload(
              zipBlob,
              getChatAttachmentGroupZipFileName(targetMessages)
            );
          })(),
          {
            loading: 'Menyiapkan arsip gambar...',
            success: 'Unduhan ZIP dimulai',
            error: 'Gagal mengunduh arsip gambar',
          },
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        console.error('Error downloading image group:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu, triggerBlobDownload]
  );

  const handleDownloadDocumentGroup = useCallback(
    async (targetMessages: ChatMessage[]) => {
      if (targetMessages.length === 0) {
        closeMessageMenu();
        return;
      }

      try {
        await toast.promise(
          (async () => {
            const zipEntries = await Promise.all(
              targetMessages.map(async targetMessage => {
                const fileBlob = await fetchChatFileBlobWithFallback(
                  targetMessage.message,
                  targetMessage.file_storage_path,
                  targetMessage.file_mime_type
                );

                if (!fileBlob) {
                  throw new Error(
                    `Failed to fetch file for group download: ${targetMessage.id}`
                  );
                }

                return {
                  blob: fileBlob,
                  fileName:
                    targetMessage.file_name?.trim() ||
                    getAttachmentFileName(targetMessage) ||
                    getChatDownloadFileName(targetMessage),
                };
              })
            );
            const zipBlob = await buildZipBlob(zipEntries);

            triggerBlobDownload(
              zipBlob,
              getChatAttachmentGroupZipFileName(targetMessages)
            );
          })(),
          {
            loading: 'Menyiapkan arsip lampiran...',
            success: 'Unduhan ZIP dimulai',
            error: 'Gagal mengunduh arsip lampiran',
          },
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        console.error('Error downloading document group:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu, triggerBlobDownload]
  );

  return {
    handleCopyMessage,
    handleDownloadMessage,
    handleDownloadImageGroup,
    handleDownloadDocumentGroup,
  };
};
