import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  CHAT_PDF_COMPRESS_MAX_BYTES,
} from '../../../../shared/chatFunctionContracts';
import { chatSidebarAttachmentGateway } from '../data/chatSidebarGateway';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
} from '../constants';
import type {
  LoadingComposerAttachment,
  PendingComposerAttachment,
} from '../types';
import { fetchAttachmentComposerRemoteFile } from '../utils/composer-attachment-link';
import { isPdfComposerAttachment } from '../utils/pending-composer-attachment';

interface UseComposerLoadingAttachmentsProps {
  editingMessageId: string | null;
  pendingComposerAttachments: PendingComposerAttachment[];
  queueComposerFile: (file: File, fileKind: 'document' | 'audio') => boolean;
  queueComposerImage: (file: File) => boolean;
  replacePendingComposerAttachmentFile: (
    attachmentId: string,
    nextFile: File
  ) => boolean;
  resetKey?: string | null;
}

interface QueueLoadingComposerAttachmentOptions {
  fileName?: string;
  replaceAttachmentId?: string | null;
  loadingKind?: LoadingComposerAttachment['loadingKind'];
  loadingPhase?: LoadingComposerAttachment['loadingPhase'];
}

const PDF_COMPRESSION_PROCESSING_PHASE_DELAY = 900;
const PDF_COMPRESSION_DONE_PHASE_DELAY = 360;

export const useComposerLoadingAttachments = ({
  editingMessageId,
  pendingComposerAttachments,
  queueComposerFile,
  queueComposerImage,
  replacePendingComposerAttachmentFile,
  resetKey,
}: UseComposerLoadingAttachmentsProps) => {
  const [loadingComposerAttachments, setLoadingComposerAttachments] = useState<
    LoadingComposerAttachment[]
  >([]);
  const loadingComposerAttachmentsRef = useRef<LoadingComposerAttachment[]>([]);
  const pdfCompressionAbortControllersRef = useRef(
    new Map<string, AbortController>()
  );

  const syncLoadingComposerAttachments = useCallback(
    (nextAttachments: LoadingComposerAttachment[]) => {
      loadingComposerAttachmentsRef.current = nextAttachments;
      setLoadingComposerAttachments(nextAttachments);
    },
    []
  );

  const removeLoadingComposerAttachment = useCallback(
    (attachmentId: string) => {
      syncLoadingComposerAttachments(
        loadingComposerAttachmentsRef.current.filter(
          attachment => attachment.id !== attachmentId
        )
      );
    },
    [syncLoadingComposerAttachments]
  );

  const abortAllPendingPdfCompressionRequests = useCallback(() => {
    for (const abortController of pdfCompressionAbortControllersRef.current.values()) {
      abortController.abort();
    }

    pdfCompressionAbortControllersRef.current.clear();
  }, []);

  const resetLoadingComposerAttachments = useCallback(() => {
    abortAllPendingPdfCompressionRequests();
    syncLoadingComposerAttachments([]);
  }, [abortAllPendingPdfCompressionRequests, syncLoadingComposerAttachments]);

  const cancelLoadingComposerAttachment = useCallback(
    (attachmentId: string) => {
      const abortController =
        pdfCompressionAbortControllersRef.current.get(attachmentId);
      if (abortController) {
        pdfCompressionAbortControllersRef.current.delete(attachmentId);
        abortController.abort();
      }

      removeLoadingComposerAttachment(attachmentId);
    },
    [removeLoadingComposerAttachment]
  );

  const updateLoadingComposerAttachment = useCallback(
    (
      attachmentId: string,
      updates: Partial<
        Pick<LoadingComposerAttachment, 'loadingKind' | 'loadingPhase'>
      >
    ) => {
      let hasChanged = false;
      const nextAttachments = loadingComposerAttachmentsRef.current.map(
        attachment => {
          if (attachment.id !== attachmentId) {
            return attachment;
          }

          hasChanged = true;
          return {
            ...attachment,
            ...updates,
          };
        }
      );

      if (!hasChanged) {
        return false;
      }

      syncLoadingComposerAttachments(nextAttachments);
      return true;
    },
    [syncLoadingComposerAttachments]
  );

  const buildLoadingComposerAttachment = useCallback(
    (
      sourceUrl: string,
      options?: QueueLoadingComposerAttachmentOptions
    ): LoadingComposerAttachment => {
      let fileName = options?.fileName?.trim() || 'Media dari link';

      if (!options?.fileName) {
        try {
          const parsedUrl = new URL(sourceUrl);
          const rawFileName = parsedUrl.pathname.split('/').pop();
          if (rawFileName) {
            fileName = decodeURIComponent(rawFileName);
          }
        } catch {
          // Keep fallback label for invalid or opaque URLs.
        }
      }

      return {
        id: `loading_attachment_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        fileName,
        sourceUrl,
        replaceAttachmentId: options?.replaceAttachmentId ?? null,
        loadingKind: options?.loadingKind ?? 'default',
        loadingPhase: options?.loadingPhase,
        status: 'loading',
      };
    },
    []
  );

  const queueLoadingComposerAttachment = useCallback(
    (sourceUrl: string, options?: QueueLoadingComposerAttachmentOptions) => {
      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const replaceAttachmentId = options?.replaceAttachmentId?.trim() || null;
      const isReplacingExistingAttachment = replaceAttachmentId
        ? pendingComposerAttachments.some(
            attachment => attachment.id === replaceAttachmentId
          )
        : false;
      const currentAttachmentCount =
        pendingComposerAttachments.length +
        loadingComposerAttachmentsRef.current.length -
        (isReplacingExistingAttachment ? 1 : 0);
      if (currentAttachmentCount >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return null;
      }

      const loadingAttachment = buildLoadingComposerAttachment(
        sourceUrl,
        options
      );
      syncLoadingComposerAttachments([
        ...loadingComposerAttachmentsRef.current,
        loadingAttachment,
      ]);
      return loadingAttachment;
    },
    [
      buildLoadingComposerAttachment,
      editingMessageId,
      pendingComposerAttachments,
      syncLoadingComposerAttachments,
    ]
  );

  const compressPendingComposerPdf = useCallback(
    async (
      attachmentId: string,
      compressionLevel = CHAT_PDF_COMPRESS_DEFAULT_LEVEL
    ) => {
      const targetAttachment = pendingComposerAttachments.find(
        attachment =>
          attachment.id === attachmentId && isPdfComposerAttachment(attachment)
      );
      if (!targetAttachment) {
        return false;
      }

      if (targetAttachment.file.size > CHAT_PDF_COMPRESS_MAX_BYTES) {
        toast.error('Ukuran PDF maksimal 50 MB untuk kompres', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      const loadingAttachment = queueLoadingComposerAttachment(
        targetAttachment.fileName,
        {
          fileName: targetAttachment.fileName,
          replaceAttachmentId: targetAttachment.id,
          loadingKind: 'pdf-compression',
          loadingPhase: 'uploading',
        }
      );
      if (!loadingAttachment) {
        return false;
      }

      const processingPhaseTimer = window.setTimeout(() => {
        updateLoadingComposerAttachment(loadingAttachment.id, {
          loadingPhase: 'processing',
        });
      }, PDF_COMPRESSION_PROCESSING_PHASE_DELAY);
      const abortController = new AbortController();
      pdfCompressionAbortControllersRef.current.set(
        loadingAttachment.id,
        abortController
      );

      const result = await chatSidebarAttachmentGateway.compressPdf(
        targetAttachment.file,
        {
          compressionLevel,
          signal: abortController.signal,
        }
      );
      pdfCompressionAbortControllersRef.current.delete(loadingAttachment.id);
      window.clearTimeout(processingPhaseTimer);

      const isLoadingAttachmentActive =
        loadingComposerAttachmentsRef.current.some(
          attachment => attachment.id === loadingAttachment.id
        );
      if (!isLoadingAttachmentActive) {
        return false;
      }

      if (result.error || !result.data) {
        removeLoadingComposerAttachment(loadingAttachment.id);
        toast.error(result.error?.message || 'Gagal mengompres PDF', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }

      updateLoadingComposerAttachment(loadingAttachment.id, {
        loadingPhase: 'done',
      });
      await new Promise(resolve => {
        window.setTimeout(resolve, PDF_COMPRESSION_DONE_PHASE_DELAY);
      });

      const isLoadingAttachmentStillActive =
        loadingComposerAttachmentsRef.current.some(
          attachment => attachment.id === loadingAttachment.id
        );
      if (!isLoadingAttachmentStillActive) {
        return false;
      }

      removeLoadingComposerAttachment(loadingAttachment.id);
      return replacePendingComposerAttachmentFile(
        targetAttachment.id,
        result.data.file
      );
    },
    [
      pendingComposerAttachments,
      queueLoadingComposerAttachment,
      removeLoadingComposerAttachment,
      replacePendingComposerAttachmentFile,
      updateLoadingComposerAttachment,
    ]
  );

  useEffect(() => {
    resetLoadingComposerAttachments();
  }, [resetKey, resetLoadingComposerAttachments]);

  useEffect(
    () => () => {
      resetLoadingComposerAttachments();
    },
    [resetLoadingComposerAttachments]
  );

  const queueAttachmentComposerLink = useCallback(
    async (
      attachmentLink: string,
      loadingAttachment: LoadingComposerAttachment
    ) => {
      try {
        const attachmentRemoteFile =
          await fetchAttachmentComposerRemoteFile(attachmentLink);
        const isLoadingAttachmentActive =
          loadingComposerAttachmentsRef.current.some(
            attachment => attachment.id === loadingAttachment.id
          );
        if (!isLoadingAttachmentActive) {
          return false;
        }

        removeLoadingComposerAttachment(loadingAttachment.id);
        if (!attachmentRemoteFile) {
          toast.error('Link harus mengarah ke gambar atau PDF yang valid', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return false;
        }

        if (attachmentRemoteFile.fileKind === 'image') {
          return queueComposerImage(attachmentRemoteFile.file);
        }

        return queueComposerFile(attachmentRemoteFile.file, 'document');
      } catch (error) {
        removeLoadingComposerAttachment(loadingAttachment.id);
        console.error('Error queueing attachment composer link:', error);
        toast.error('Gagal mengambil file dari link', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return false;
      }
    },
    [queueComposerFile, queueComposerImage, removeLoadingComposerAttachment]
  );

  return {
    loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments:
      loadingComposerAttachments.length > 0,
    removeLoadingComposerAttachment,
    queueLoadingComposerAttachment,
    cancelLoadingComposerAttachment,
    compressPendingComposerPdf,
    queueAttachmentComposerLink,
    resetLoadingComposerAttachments,
  };
};
