import { useCallback, useEffect, useRef, type RefObject } from 'react';
import toast from 'react-hot-toast';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
  MAX_PENDING_COMPOSER_TOTAL_BYTES,
} from '../../constants';
import { compressImageIfNeeded } from '@/utils/image';
import type {
  ComposerPendingFileKind,
  PendingComposerAttachment,
} from '../../types';
import {
  buildPendingFileComposerAttachment,
  buildPendingImageComposerAttachment,
  upsertPendingComposerAttachment,
} from '../../utils/pending-composer-attachment';
import type {
  PendingComposerAttachmentsRef,
  ReleasePendingImagePreviewUrl,
  SetPendingComposerAttachments,
} from './types';

export const useComposerAttachmentQueueActions = ({
  currentChannelId,
  editingMessageId,
  markPendingComposerAttachmentsDirty,
  messageInputRef,
  pendingComposerAttachmentsRef,
  releasePendingImagePreviewUrl,
  setPendingComposerAttachments,
}: {
  currentChannelId: string | null;
  editingMessageId: string | null;
  markPendingComposerAttachmentsDirty: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  pendingComposerAttachmentsRef: PendingComposerAttachmentsRef;
  releasePendingImagePreviewUrl: ReleasePendingImagePreviewUrl;
  setPendingComposerAttachments: SetPendingComposerAttachments;
}) => {
  const textareaFocusFrameRef = useRef<number | null>(null);
  const textareaFocusRequestRef = useRef(0);

  const clearPendingTextareaFocusFrame = useCallback(() => {
    textareaFocusRequestRef.current += 1;

    if (textareaFocusFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(textareaFocusFrameRef.current);
    textareaFocusFrameRef.current = null;
  }, []);

  const focusTextarea = useCallback(() => {
    clearPendingTextareaFocusFrame();

    const focusRequestId = textareaFocusRequestRef.current + 1;
    let didRunSynchronously = false;
    textareaFocusRequestRef.current = focusRequestId;

    const frameId = window.requestAnimationFrame(() => {
      didRunSynchronously = true;

      if (textareaFocusRequestRef.current !== focusRequestId) {
        return;
      }

      textareaFocusFrameRef.current = null;
      const textarea = messageInputRef.current;
      if (!textarea) return;

      textarea.focus();
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });

    if (didRunSynchronously) {
      return;
    }

    textareaFocusFrameRef.current = frameId;
  }, [clearPendingTextareaFocusFrame, messageInputRef]);

  useEffect(() => {
    clearPendingTextareaFocusFrame();
  }, [clearPendingTextareaFocusFrame, currentChannelId]);

  useEffect(
    () => () => {
      clearPendingTextareaFocusFrame();
    },
    [clearPendingTextareaFocusFrame]
  );

  const removePendingComposerAttachment = useCallback(
    (attachmentId: string) => {
      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments => {
        const targetAttachment = previousAttachments.find(
          attachment => attachment.id === attachmentId
        );
        if (targetAttachment) {
          releasePendingImagePreviewUrl(
            targetAttachment.id,
            targetAttachment.previewUrl
          );
        }
        return previousAttachments.filter(
          attachment => attachment.id !== attachmentId
        );
      });
    },
    [
      markPendingComposerAttachmentsDirty,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
  );

  const clearPendingComposerAttachments = useCallback(() => {
    clearPendingTextareaFocusFrame();
    markPendingComposerAttachmentsDirty();
    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        releasePendingImagePreviewUrl(attachment.id, attachment.previewUrl);
      });
      return [];
    });
  }, [
    clearPendingTextareaFocusFrame,
    markPendingComposerAttachmentsDirty,
    releasePendingImagePreviewUrl,
    setPendingComposerAttachments,
  ]);

  const restorePendingComposerAttachments = useCallback(
    (attachments: PendingComposerAttachment[]) => {
      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments => {
        previousAttachments.forEach(attachment => {
          releasePendingImagePreviewUrl(attachment.id, attachment.previewUrl);
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
    [
      focusTextarea,
      markPendingComposerAttachmentsDirty,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
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
      let exceededCountLimit = false;
      let exceededSizeLimit = false;
      let replacedPreviewUrl: string | null = null;
      let rejectedPreviewUrl: string | null = null;

      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments => {
        const upsertResult = upsertPendingComposerAttachment(
          previousAttachments,
          nextAttachment,
          {
            maxAttachments: MAX_PENDING_COMPOSER_ATTACHMENTS,
            maxTotalBytes: MAX_PENDING_COMPOSER_TOTAL_BYTES,
            replaceAttachmentId,
            replaceableKinds: ['image'],
          }
        );

        exceededCountLimit = upsertResult.exceededLimit;
        exceededSizeLimit = upsertResult.exceededSizeLimit;
        replacedPreviewUrl = upsertResult.replacedPreviewUrl;
        rejectedPreviewUrl = upsertResult.rejectedPreviewUrl;
        return upsertResult.attachments;
      });

      if (replacedPreviewUrl) {
        releasePendingImagePreviewUrl(
          replaceAttachmentId ?? '',
          replacedPreviewUrl
        );
      }

      if (rejectedPreviewUrl) {
        URL.revokeObjectURL(rejectedPreviewUrl);
      }

      if (exceededCountLimit) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      if (exceededSizeLimit) {
        toast.error('Maksimal total 2 GB lampiran dalam satu kirim', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      focusTextarea();
      return true;
    },
    [
      editingMessageId,
      focusTextarea,
      markPendingComposerAttachmentsDirty,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
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
      let exceededCountLimit = false;
      let exceededSizeLimit = false;
      let replacedPreviewUrl: string | null = null;
      let rejectedPreviewUrl: string | null = null;

      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments => {
        const upsertResult = upsertPendingComposerAttachment(
          previousAttachments,
          nextAttachment,
          {
            maxAttachments: MAX_PENDING_COMPOSER_ATTACHMENTS,
            maxTotalBytes: MAX_PENDING_COMPOSER_TOTAL_BYTES,
            replaceAttachmentId,
            replaceableKinds: [fileKind],
          }
        );

        exceededCountLimit = upsertResult.exceededLimit;
        exceededSizeLimit = upsertResult.exceededSizeLimit;
        replacedPreviewUrl = upsertResult.replacedPreviewUrl;
        rejectedPreviewUrl = upsertResult.rejectedPreviewUrl;
        return upsertResult.attachments;
      });

      if (replacedPreviewUrl) {
        releasePendingImagePreviewUrl(
          replaceAttachmentId ?? '',
          replacedPreviewUrl
        );
      }

      if (rejectedPreviewUrl) {
        URL.revokeObjectURL(rejectedPreviewUrl);
      }

      if (exceededCountLimit) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return false;
      }

      if (exceededSizeLimit) {
        toast.error('Maksimal total 2 GB lampiran dalam satu kirim', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      focusTextarea();
      return true;
    },
    [
      editingMessageId,
      focusTextarea,
      markPendingComposerAttachmentsDirty,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
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
      const activeTargetAttachment = pendingComposerAttachmentsRef.current.find(
        attachment =>
          attachment.id === attachmentId &&
          attachment.fileKind === 'image' &&
          attachment.file === targetAttachment.file
      );
      if (!activeTargetAttachment) {
        return false;
      }

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

      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments =>
        previousAttachments.map(attachment =>
          attachment.id === attachmentId ? nextAttachment : attachment
        )
      );

      releasePendingImagePreviewUrl(
        targetAttachment.id,
        targetAttachment.previewUrl
      );

      focusTextarea();
      return true;
    },
    [
      focusTextarea,
      markPendingComposerAttachmentsDirty,
      pendingComposerAttachmentsRef,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
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

      markPendingComposerAttachmentsDirty();
      setPendingComposerAttachments(previousAttachments =>
        previousAttachments.map(attachment =>
          attachment.id === attachmentId ? nextAttachment : attachment
        )
      );

      releasePendingImagePreviewUrl(
        targetAttachment.id,
        targetAttachment.previewUrl
      );

      focusTextarea();
      return true;
    },
    [
      focusTextarea,
      markPendingComposerAttachmentsDirty,
      pendingComposerAttachmentsRef,
      releasePendingImagePreviewUrl,
      setPendingComposerAttachments,
    ]
  );

  return {
    removePendingComposerAttachment,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  };
};
