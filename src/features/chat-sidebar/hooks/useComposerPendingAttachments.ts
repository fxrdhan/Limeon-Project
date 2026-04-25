import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import toast from 'react-hot-toast';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
  MAX_PENDING_COMPOSER_TOTAL_BYTES,
} from '../constants';
import { compressImageIfNeeded } from '@/utils/image';
import { renderPdfPreviewDataUrl } from '../utils/pdf-preview';
import { createImagePreviewBlob } from '../utils/image-message-preview';
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
import {
  loadPersistedComposerDraftAttachments,
  persistComposerDraftAttachments,
} from '../utils/composer-draft-persistence';

interface UseComposerPendingAttachmentsProps {
  currentChannelId: string | null;
  userId?: string | null;
  editingMessageId: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

const buildPendingImagePreviewSignature = (
  attachment: PendingComposerAttachment
) =>
  attachment.fileKind === 'image'
    ? [
        attachment.id,
        attachment.file.name,
        attachment.file.size,
        attachment.file.lastModified,
        attachment.file.type,
      ].join(':')
    : null;

export const useComposerPendingAttachments = ({
  currentChannelId,
  userId = null,
  editingMessageId,
  messageInputRef,
}: UseComposerPendingAttachmentsProps) => {
  const [pendingComposerAttachments, setPendingComposerAttachments] = useState<
    PendingComposerAttachment[]
  >([]);
  const pendingComposerAttachmentsRef = useRef<PendingComposerAttachment[]>([]);
  const pendingImagePreviewUrlsRef = useRef<Map<string, string>>(new Map());
  const pendingImagePreviewGenerationRef = useRef<Map<string, string>>(
    new Map()
  );
  const pendingComposerAttachmentsMutationVersionRef = useRef(0);
  const pendingComposerAttachmentsHydrationRef = useRef<{
    channelId: string | null;
    isHydrating: boolean;
  }>({
    channelId: null,
    isHydrating: false,
  });
  const releasePendingImagePreviewUrl = useCallback(
    (attachmentId: string, previewUrl?: string | null) => {
      const trackedPreviewUrl =
        pendingImagePreviewUrlsRef.current.get(attachmentId) || null;

      if (trackedPreviewUrl) {
        URL.revokeObjectURL(trackedPreviewUrl);
        pendingImagePreviewUrlsRef.current.delete(attachmentId);
      }

      if (previewUrl && previewUrl !== trackedPreviewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      pendingImagePreviewGenerationRef.current.delete(attachmentId);
    },
    []
  );

  useEffect(() => {
    pendingComposerAttachmentsRef.current.length = 0;
    pendingComposerAttachmentsRef.current.push(...pendingComposerAttachments);
  }, [pendingComposerAttachments]);

  useLayoutEffect(() => {
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

  useEffect(() => {
    const imageAttachments = pendingComposerAttachments.filter(
      attachment => attachment.fileKind === 'image'
    );
    const activeImageAttachmentIds = new Set(
      imageAttachments.map(attachment => attachment.id)
    );

    pendingImagePreviewGenerationRef.current.forEach((_, attachmentId) => {
      if (!activeImageAttachmentIds.has(attachmentId)) {
        pendingImagePreviewGenerationRef.current.delete(attachmentId);
      }
    });

    imageAttachments.forEach(attachment => {
      const previewSignature = buildPendingImagePreviewSignature(attachment);

      if (!previewSignature) {
        return;
      }

      if (
        pendingImagePreviewGenerationRef.current.get(attachment.id) ===
        previewSignature
      ) {
        return;
      }

      pendingImagePreviewGenerationRef.current.set(
        attachment.id,
        previewSignature
      );

      void (async () => {
        const previewBlob = await createImagePreviewBlob(attachment.file);
        if (!previewBlob) {
          return;
        }

        const nextPreviewUrl = URL.createObjectURL(previewBlob);

        setPendingComposerAttachments(previousAttachments => {
          const targetAttachment = previousAttachments.find(
            previousAttachment =>
              previousAttachment.id === attachment.id &&
              previousAttachment.fileKind === 'image'
          );

          if (!targetAttachment) {
            URL.revokeObjectURL(nextPreviewUrl);
            return previousAttachments;
          }

          if (
            buildPendingImagePreviewSignature(targetAttachment) !==
            previewSignature
          ) {
            URL.revokeObjectURL(nextPreviewUrl);
            return previousAttachments;
          }

          if (targetAttachment.previewUrl === nextPreviewUrl) {
            return previousAttachments;
          }

          const previousPreviewUrl = targetAttachment.previewUrl;
          pendingImagePreviewUrlsRef.current.set(attachment.id, nextPreviewUrl);

          if (previousPreviewUrl) {
            URL.revokeObjectURL(previousPreviewUrl);
          }

          return previousAttachments.map(previousAttachment =>
            previousAttachment.id === attachment.id
              ? {
                  ...previousAttachment,
                  previewUrl: nextPreviewUrl,
                }
              : previousAttachment
          );
        });
      })();
    });
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

  const markPendingComposerAttachmentsDirty = useCallback(() => {
    pendingComposerAttachmentsMutationVersionRef.current += 1;
    pendingComposerAttachmentsHydrationRef.current = {
      channelId: currentChannelId,
      isHydrating: false,
    };
  }, [currentChannelId]);

  useEffect(() => {
    let isCancelled = false;

    pendingComposerAttachmentsMutationVersionRef.current += 1;
    const hydrationVersion =
      pendingComposerAttachmentsMutationVersionRef.current;
    pendingComposerAttachmentsHydrationRef.current = {
      channelId: currentChannelId,
      isHydrating: true,
    };

    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        releasePendingImagePreviewUrl(attachment.id, attachment.previewUrl);
      });
      return [];
    });

    if (!currentChannelId) {
      pendingComposerAttachmentsHydrationRef.current = {
        channelId: null,
        isHydrating: false,
      };
      return;
    }

    void (async () => {
      const persistedAttachments = await loadPersistedComposerDraftAttachments(
        currentChannelId,
        userId
      );
      if (
        isCancelled ||
        pendingComposerAttachmentsMutationVersionRef.current !==
          hydrationVersion
      ) {
        return;
      }

      pendingComposerAttachmentsMutationVersionRef.current += 1;
      pendingComposerAttachmentsHydrationRef.current = {
        channelId: currentChannelId,
        isHydrating: false,
      };
      setPendingComposerAttachments(() =>
        persistedAttachments.map(attachment => ({
          ...attachment,
          previewUrl:
            attachment.fileKind === 'image'
              ? URL.createObjectURL(attachment.file)
              : null,
        }))
      );
    })();

    return () => {
      isCancelled = true;
    };
  }, [currentChannelId, releasePendingImagePreviewUrl, userId]);

  useEffect(() => {
    if (!currentChannelId) {
      return;
    }

    const hydrationState = pendingComposerAttachmentsHydrationRef.current;
    if (
      hydrationState.channelId === currentChannelId &&
      hydrationState.isHydrating
    ) {
      return;
    }

    void persistComposerDraftAttachments(
      currentChannelId,
      pendingComposerAttachments,
      userId
    );
  }, [currentChannelId, pendingComposerAttachments, userId]);

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
    [markPendingComposerAttachmentsDirty, releasePendingImagePreviewUrl]
  );

  const clearPendingComposerAttachments = useCallback(() => {
    markPendingComposerAttachmentsDirty();
    setPendingComposerAttachments(previousAttachments => {
      previousAttachments.forEach(attachment => {
        releasePendingImagePreviewUrl(attachment.id, attachment.previewUrl);
      });
      return [];
    });
  }, [markPendingComposerAttachmentsDirty, releasePendingImagePreviewUrl]);

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
      releasePendingImagePreviewUrl,
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
      releasePendingImagePreviewUrl,
    ]
  );

  useEffect(() => {
    const pendingImagePreviewUrls = pendingImagePreviewUrlsRef.current;
    const pendingAttachments = pendingComposerAttachmentsRef.current;
    const pendingImagePreviewGeneration =
      pendingImagePreviewGenerationRef.current;

    return () => {
      pendingImagePreviewUrls.forEach(previewUrl => {
        URL.revokeObjectURL(previewUrl);
      });
      pendingImagePreviewUrls.clear();
      pendingImagePreviewGeneration.clear();

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
