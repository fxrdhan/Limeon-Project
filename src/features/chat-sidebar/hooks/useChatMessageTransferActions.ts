import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  getAttachmentFileName,
  getChatAttachmentGroupZipFileName,
  getChatDownloadFileName,
} from '../utils/attachment';
import {
  copyTextToClipboard,
  getClipboardImagePayload,
} from '../utils/clipboard';
import { fetchChatFileBlobWithFallback } from '../utils/message-file';
import { buildZipBlob } from '../utils/zip';

export const useChatMessageTransferActions = ({
  closeMessageMenu,
  resetKey = null,
}: {
  closeMessageMenu: () => void;
  resetKey?: string | null;
}) => {
  const normalizedResetKey = resetKey?.trim() || null;
  const activeTransferResetKeyRef = useRef<string | null>(normalizedResetKey);
  const activeTransferScopeVersionRef = useRef(0);
  const nextTransferToastIdRef = useRef(0);
  const activeTransferToastIdsRef = useRef<Set<string>>(new Set());
  const isTransferScopeMountedRef = useRef(true);

  const isTransferScopeActive = useCallback(
    (scopeVersion: number) =>
      isTransferScopeMountedRef.current &&
      activeTransferScopeVersionRef.current === scopeVersion,
    []
  );

  const invalidateTransferScope = useCallback(() => {
    activeTransferScopeVersionRef.current += 1;
    activeTransferToastIdsRef.current.forEach(toastId => {
      toast.dismiss(toastId);
    });
    activeTransferToastIdsRef.current.clear();
  }, []);

  useEffect(() => {
    const previousResetKey = activeTransferResetKeyRef.current;
    activeTransferResetKeyRef.current = normalizedResetKey;

    if (previousResetKey !== normalizedResetKey) {
      invalidateTransferScope();
    }
  }, [invalidateTransferScope, normalizedResetKey]);

  useEffect(
    () => () => {
      isTransferScopeMountedRef.current = false;
      invalidateTransferScope();
    },
    [invalidateTransferScope]
  );

  const runTransferWithFeedback = useCallback(
    async ({
      error,
      loading,
      operation,
      toastIdPrefix,
      success,
    }: {
      error: string;
      loading: string;
      operation: (isActive: () => boolean) => Promise<void>;
      toastIdPrefix: string;
      success: string;
    }) => {
      const scopeVersion = activeTransferScopeVersionRef.current;
      const isCurrentOperationActive = () =>
        isTransferScopeActive(scopeVersion);
      const toastId = `${toastIdPrefix}-${nextTransferToastIdRef.current + 1}`;
      nextTransferToastIdRef.current += 1;
      activeTransferToastIdsRef.current.add(toastId);
      toast.loading(loading, {
        id: toastId,
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });

      try {
        await operation(isCurrentOperationActive);

        if (!isTransferScopeActive(scopeVersion)) {
          toast.dismiss(toastId);
          return false;
        }

        toast.success(success, {
          id: toastId,
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return true;
      } catch (operationError) {
        if (!isTransferScopeActive(scopeVersion)) {
          toast.dismiss(toastId);
          return false;
        }

        toast.error(error, {
          id: toastId,
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        throw operationError;
      } finally {
        activeTransferToastIdsRef.current.delete(toastId);
      }
    },
    [isTransferScopeActive]
  );

  const triggerBlobDownload = useCallback(
    (fileBlob: Blob, fileName: string) => {
      const objectUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');

      try {
        link.href = objectUrl;
        link.download = fileName;
        link.rel = 'noreferrer';
        document.body.append(link);
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 1500);
      }
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
      const scopeVersion = activeTransferScopeVersionRef.current;

      if (targetMessage.message_type === 'image') {
        try {
          await runTransferWithFeedback({
            error: 'Gagal menyalin gambar ke clipboard',
            loading: 'Menyalin gambar...',
            success: 'Gambar berhasil disalin',
            toastIdPrefix: 'chat-copy-image-message',
            operation: async isActive => {
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
              if (!isActive()) {
                return;
              }

              await writeImageToClipboard([
                new ClipboardItem({
                  [clipboardPayload.mimeType]: clipboardPayload.blob,
                }),
              ]);
            },
          });
        } catch (error) {
          console.error('Error copying message:', error);
        }

        return;
      }

      try {
        await copyTextToClipboard(buildCopyableMessageText(targetMessage));
        if (!isTransferScopeActive(scopeVersion)) {
          return;
        }

        toast.success(
          targetMessage.message_type === 'file'
            ? 'Lampiran berhasil disalin'
            : 'Pesan berhasil disalin',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        if (!isTransferScopeActive(scopeVersion)) {
          return;
        }

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
    [
      buildCopyableMessageText,
      closeMessageMenu,
      isTransferScopeActive,
      runTransferWithFeedback,
    ]
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
        await runTransferWithFeedback({
          error: 'Gagal mengunduh file',
          loading: 'Menyiapkan unduhan...',
          success: 'Unduhan dimulai',
          toastIdPrefix: 'chat-download-message',
          operation: async isActive => {
            const fileBlob = await fetchChatFileBlobWithFallback(
              fileUrl,
              targetMessage.file_storage_path
            );
            if (!fileBlob) {
              throw new Error('Failed to fetch file for download');
            }

            if (!isActive()) {
              return;
            }

            triggerBlobDownload(fileBlob, fileName);
          },
        });
      } catch (error) {
        console.error('Error downloading file:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu, runTransferWithFeedback, triggerBlobDownload]
  );

  const handleDownloadImageGroup = useCallback(
    async (targetMessages: ChatMessage[]) => {
      if (targetMessages.length === 0) {
        closeMessageMenu();
        return;
      }

      try {
        await runTransferWithFeedback({
          error: 'Gagal mengunduh arsip gambar',
          loading: 'Menyiapkan arsip gambar...',
          success: 'Unduhan ZIP dimulai',
          toastIdPrefix: 'chat-download-image-group',
          operation: async isActive => {
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

            if (!isActive()) {
              return;
            }

            triggerBlobDownload(
              zipBlob,
              getChatAttachmentGroupZipFileName(targetMessages)
            );
          },
        });
      } catch (error) {
        console.error('Error downloading image group:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu, runTransferWithFeedback, triggerBlobDownload]
  );

  const handleDownloadDocumentGroup = useCallback(
    async (targetMessages: ChatMessage[]) => {
      if (targetMessages.length === 0) {
        closeMessageMenu();
        return;
      }

      try {
        await runTransferWithFeedback({
          error: 'Gagal mengunduh arsip lampiran',
          loading: 'Menyiapkan arsip lampiran...',
          success: 'Unduhan ZIP dimulai',
          toastIdPrefix: 'chat-download-document-group',
          operation: async isActive => {
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

            if (!isActive()) {
              return;
            }

            triggerBlobDownload(
              zipBlob,
              getChatAttachmentGroupZipFileName(targetMessages)
            );
          },
        });
      } catch (error) {
        console.error('Error downloading document group:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu, runTransferWithFeedback, triggerBlobDownload]
  );

  return {
    handleCopyMessage,
    handleDownloadMessage,
    handleDownloadImageGroup,
    handleDownloadDocumentGroup,
  };
};
