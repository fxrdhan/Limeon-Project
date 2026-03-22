import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import toast from 'react-hot-toast';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
} from '../constants';
import { compressImageIfNeeded } from '@/utils/image';
import { renderPdfPreviewDataUrl } from '../utils/pdf-preview';
import type {
  ComposerPendingFileKind,
  PendingComposerAttachment,
} from '../types';
import {
  buildPendingFileComposerAttachment,
  buildPendingImageComposerAttachment,
  isPdfComposerAttachment,
  upsertPendingComposerAttachment,
} from '../utils/pending-composer-attachment';

interface UseComposerPendingAttachmentsProps {
  editingMessageId: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useComposerPendingAttachments = ({
  editingMessageId,
  messageInputRef,
}: UseComposerPendingAttachmentsProps) => {
  const [pendingComposerAttachments, setPendingComposerAttachments] = useState<
    PendingComposerAttachment[]
  >([]);
  const pendingComposerAttachmentsRef = useRef<PendingComposerAttachment[]>([]);
  const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    pendingComposerAttachmentsRef.current.length = 0;
    pendingComposerAttachmentsRef.current.push(...pendingComposerAttachments);
  }, [pendingComposerAttachments]);

  useEffect(() => {
    let isCancelled = false;
    const pendingPdfAttachments = pendingComposerAttachments.filter(
      attachment =>
        attachment.pdfCoverUrl === null && isPdfComposerAttachment(attachment)
    );
    if (pendingPdfAttachments.length === 0) return;

    const renderPdfCovers = async () => {
      try {
        for (const pendingAttachment of pendingPdfAttachments) {
          if (isCancelled) return;

          const renderedPreview = await renderPdfPreviewDataUrl(
            pendingAttachment.file,
            44
          );
          if (isCancelled) return;
          if (!renderedPreview) continue;

          setPendingComposerAttachments(previousAttachments =>
            previousAttachments.map(attachment =>
              attachment.id === pendingAttachment.id
                ? {
                    ...attachment,
                    pdfCoverUrl: renderedPreview.coverDataUrl,
                    pdfPageCount: renderedPreview.pageCount,
                  }
                : attachment
            )
          );
        }
      } catch (error) {
        console.error('Error rendering PDF cover preview:', error);
      }
    };

    void renderPdfCovers();

    return () => {
      isCancelled = true;
    };
  }, [pendingComposerAttachments]);

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      const textarea = messageInputRef.current;
      if (!textarea) return;

      textarea.focus();
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  }, [messageInputRef]);

  const removePendingComposerAttachment = useCallback(
    (attachmentId: string) => {
      setPendingComposerAttachments(previousAttachments => {
        const targetAttachment = previousAttachments.find(
          attachment => attachment.id === attachmentId
        );
        if (targetAttachment?.previewUrl) {
          URL.revokeObjectURL(targetAttachment.previewUrl);
        }
        return previousAttachments.filter(
          attachment => attachment.id !== attachmentId
        );
      });
    },
    []
  );

  const clearPendingComposerAttachments = useCallback(() => {
    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const restorePendingComposerAttachments = useCallback(
    (attachments: PendingComposerAttachment[]) => {
      setPendingComposerAttachments(previousAttachments => {
        previousAttachments.forEach(attachment => {
          if (attachment.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
          }
        });

        return attachments.map(attachment => ({
          ...attachment,
          previewUrl:
            attachment.fileKind === 'image'
              ? URL.createObjectURL(attachment.file)
              : null,
        }));
      });

      focusTextarea();
    },
    [focusTextarea]
  );

  const queueComposerImage = useCallback(
    (file: File, replaceAttachmentId?: string) => {
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      const nextAttachment = buildPendingImageComposerAttachment(file);
      let exceededAttachmentLimit = false;
      let replacedPreviewUrl: string | null = null;

      setPendingComposerAttachments(previousAttachments => {
        const upsertResult = upsertPendingComposerAttachment(
          previousAttachments,
          nextAttachment,
          {
            maxAttachments: MAX_PENDING_COMPOSER_ATTACHMENTS,
            replaceAttachmentId,
            replaceableKinds: ['image'],
          }
        );

        exceededAttachmentLimit = upsertResult.exceededLimit;
        replacedPreviewUrl = upsertResult.replacedPreviewUrl;
        return upsertResult.attachments;
      });

      if (replacedPreviewUrl) {
        URL.revokeObjectURL(replacedPreviewUrl);
      }

      if (exceededAttachmentLimit) {
        if (nextAttachment.previewUrl) {
          URL.revokeObjectURL(nextAttachment.previewUrl);
        }
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      focusTextarea();
      return true;
    },
    [editingMessageId, focusTextarea]
  );

  const queueComposerFile = useCallback(
    (
      file: File,
      fileKind: ComposerPendingFileKind,
      replaceAttachmentId?: string
    ) => {
      const isAudioFile = file.type.startsWith('audio/');
      if (fileKind === 'audio' && !isAudioFile) {
        toast.error('File harus berupa audio', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      const nextAttachment = buildPendingFileComposerAttachment(file, fileKind);
      let exceededAttachmentLimit = false;
      let replacedPreviewUrl: string | null = null;

      setPendingComposerAttachments(previousAttachments => {
        const upsertResult = upsertPendingComposerAttachment(
          previousAttachments,
          nextAttachment,
          {
            maxAttachments: MAX_PENDING_COMPOSER_ATTACHMENTS,
            replaceAttachmentId,
            replaceableKinds: [fileKind],
          }
        );

        exceededAttachmentLimit = upsertResult.exceededLimit;
        replacedPreviewUrl = upsertResult.replacedPreviewUrl;
        return upsertResult.attachments;
      });

      if (replacedPreviewUrl) {
        URL.revokeObjectURL(replacedPreviewUrl);
      }

      if (exceededAttachmentLimit) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      focusTextarea();
      return true;
    },
    [editingMessageId, focusTextarea]
  );

  const compressPendingComposerImage = useCallback(
    async (attachmentId: string) => {
      const targetAttachment = pendingComposerAttachmentsRef.current.find(
        attachment =>
          attachment.id === attachmentId && attachment.fileKind === 'image'
      );
      if (!targetAttachment) {
        return false;
      }

      const compressedImage = await compressImageIfNeeded(
        targetAttachment.file
      );
      const nextFile =
        compressedImage instanceof File
          ? compressedImage
          : new File(
              [compressedImage],
              targetAttachment.file.name || targetAttachment.fileName,
              {
                type: compressedImage.type || targetAttachment.file.type,
                lastModified: Date.now(),
              }
            );

      if (nextFile === targetAttachment.file) {
        focusTextarea();
        return true;
      }

      const nextAttachment = {
        ...buildPendingImageComposerAttachment(nextFile),
        id: targetAttachment.id,
      };

      setPendingComposerAttachments(previousAttachments =>
        previousAttachments.map(attachment =>
          attachment.id === attachmentId ? nextAttachment : attachment
        )
      );

      if (targetAttachment.previewUrl) {
        URL.revokeObjectURL(targetAttachment.previewUrl);
      }

      focusTextarea();
      return true;
    },
    [focusTextarea]
  );

  const replacePendingComposerAttachmentFile = useCallback(
    (attachmentId: string, nextFile: File) => {
      const targetAttachment = pendingComposerAttachmentsRef.current.find(
        attachment => attachment.id === attachmentId
      );
      if (!targetAttachment) {
        return false;
      }

      const nextAttachment =
        targetAttachment.fileKind === 'image'
          ? {
              ...buildPendingImageComposerAttachment(nextFile),
              id: targetAttachment.id,
            }
          : {
              ...buildPendingFileComposerAttachment(
                nextFile,
                targetAttachment.fileKind
              ),
              id: targetAttachment.id,
            };

      setPendingComposerAttachments(previousAttachments =>
        previousAttachments.map(attachment =>
          attachment.id === attachmentId ? nextAttachment : attachment
        )
      );

      if (targetAttachment.previewUrl) {
        URL.revokeObjectURL(targetAttachment.previewUrl);
      }

      focusTextarea();
      return true;
    },
    [focusTextarea]
  );

  useEffect(() => {
    const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;
    const pendingAttachments = pendingComposerAttachmentsRef.current;

    return () => {
      pendingImagePreviewUrls.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl);
      });
      pendingImagePreviewUrls.clear();

      pendingAttachments.forEach(attachment => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      pendingComposerAttachmentsRef.current = [];
    };
  }, []);

  return {
    pendingComposerAttachments,
    pendingImagePreviewUrlsRef,
    removePendingComposerAttachment,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  };
};
