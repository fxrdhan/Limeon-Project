import {
  type Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import toast from 'react-hot-toast';
import { chatPdfCompressService } from '@/services/api/chat/pdf-compress.service';
import {
  CHAT_PDF_COMPRESS_DEFAULT_LEVEL,
  CHAT_PDF_COMPRESS_MAX_BYTES,
} from '../../../../shared/chatFunctionContracts';
import { extractChatStoragePath } from '../../../../shared/chatStoragePaths';
import { chatSidebarShareGateway } from '../data/chatSidebarGateway';
import {
  CHAT_SIDEBAR_TOASTER_ID,
  COMPOSER_IMAGE_PREVIEW_EXIT_DURATION,
  MAX_PENDING_COMPOSER_ATTACHMENTS,
} from '../constants';
import { openInNewTab } from '../utils/message-file';
import type {
  LoadingComposerAttachment,
  PendingComposerAttachment,
} from '../types';
import {
  extractComposerLinkFromClipboard,
  fetchAttachmentComposerRemoteFile,
  validateAttachmentComposerLink,
} from '../utils/composer-attachment-link';
import { isPdfComposerAttachment } from '../utils/pending-composer-attachment';
import { useComposerPendingAttachments } from './useComposerPendingAttachments';
import type { ComposerPromptableLink } from '../models';

interface UseChatComposerAttachmentsProps {
  editingMessageId: string | null;
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

interface AttachmentPastePromptState {
  id: string;
  isAttachmentCandidate: boolean;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

interface PastedAttachmentCandidate {
  id: string;
  pastedText: string;
  url: string;
}

interface HoverableAttachmentCandidate {
  id: string;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

const PDF_COMPRESSION_PROCESSING_PHASE_DELAY = 900;
const PDF_COMPRESSION_DONE_PHASE_DELAY = 360;

export const useChatComposerAttachments = ({
  editingMessageId,
  closeMessageMenu,
  messageInputRef,
  message,
  setMessage,
}: UseChatComposerAttachmentsProps) => {
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [
    composerImagePreviewAttachmentId,
    setComposerImagePreviewAttachmentId,
  ] = useState<string | null>(null);
  const [isComposerImageExpanded, setIsComposerImageExpanded] = useState(false);
  const [isComposerImageExpandedVisible, setIsComposerImageExpandedVisible] =
    useState(false);

  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachModalRef = useRef<HTMLDivElement>(null);
  const attachmentPastePromptRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const replaceComposerImageAttachmentIdRef = useRef<string | null>(null);
  const replaceComposerDocumentAttachmentIdRef = useRef<string | null>(null);
  const composerImagePreviewCloseTimerRef = useRef<number | null>(null);
  const {
    pendingComposerAttachments,
    pendingImagePreviewUrlsRef,
    removePendingComposerAttachment: removePendingComposerAttachmentFromQueue,
    clearPendingComposerAttachments: clearPendingComposerAttachmentsFromQueue,
    restorePendingComposerAttachments:
      restorePendingComposerAttachmentsFromQueue,
    queueComposerImage,
    queueComposerFile,
    compressPendingComposerImage,
    replacePendingComposerAttachmentFile,
  } = useComposerPendingAttachments({
    editingMessageId,
    messageInputRef,
  });
  const [loadingComposerAttachments, setLoadingComposerAttachments] = useState<
    LoadingComposerAttachment[]
  >([]);
  const loadingComposerAttachmentsRef = useRef<LoadingComposerAttachment[]>([]);
  const pdfCompressionAbortControllersRef = useRef(
    new Map<string, AbortController>()
  );
  const [attachmentPastePrompt, setAttachmentPastePrompt] =
    useState<AttachmentPastePromptState | null>(null);
  const [pastedAttachmentCandidates, setPastedAttachmentCandidates] = useState<
    PastedAttachmentCandidate[]
  >([]);
  const [rawAttachmentUrl, setRawAttachmentUrl] = useState<string | null>(null);
  const attachmentPasteValidationScopeRef = useRef(0);
  const isAttachmentPastePromptShortenable = Boolean(
    attachmentPastePrompt?.url
  );

  const previewComposerImageAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === composerImagePreviewAttachmentId &&
      attachment.fileKind === 'image'
  );
  const hoverableAttachmentCandidates = useMemo(() => {
    let searchStart = 0;

    return pastedAttachmentCandidates.flatMap(candidate => {
      const rangeStart = message.indexOf(candidate.pastedText, searchStart);
      if (rangeStart < 0) {
        return [];
      }

      const rangeEnd = rangeStart + candidate.pastedText.length;
      searchStart = rangeEnd;

      return [
        {
          id: candidate.id,
          url: candidate.url,
          pastedText: candidate.pastedText,
          rangeStart,
          rangeEnd,
        } satisfies HoverableAttachmentCandidate,
      ];
    });
  }, [message, pastedAttachmentCandidates]);
  const hoverableAttachmentUrl =
    hoverableAttachmentCandidates.length === 1
      ? (hoverableAttachmentCandidates[0]?.url ?? null)
      : null;
  const composerAttachmentPreviewItems = useMemo(() => {
    if (loadingComposerAttachments.length === 0) {
      return pendingComposerAttachments;
    }

    const pendingAttachmentIds = new Set(
      pendingComposerAttachments.map(attachment => attachment.id)
    );
    const loadingByReplacedAttachmentId = new Map(
      loadingComposerAttachments
        .filter(
          attachment =>
            attachment.replaceAttachmentId &&
            pendingAttachmentIds.has(attachment.replaceAttachmentId)
        )
        .map(attachment => [attachment.replaceAttachmentId!, attachment])
    );

    const previewItems = pendingComposerAttachments.map(attachment => {
      return loadingByReplacedAttachmentId.get(attachment.id) ?? attachment;
    });
    const danglingLoadingAttachments = loadingComposerAttachments.filter(
      attachment =>
        !attachment.replaceAttachmentId ||
        !pendingAttachmentIds.has(attachment.replaceAttachmentId)
    );

    return [...previewItems, ...danglingLoadingAttachments];
  }, [loadingComposerAttachments, pendingComposerAttachments]);

  useEffect(() => {
    if (previewComposerImageAttachment || !isComposerImageExpanded) return;
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
  }, [isComposerImageExpanded, previewComposerImageAttachment]);

  useEffect(() => {
    if (!isComposerImageExpanded) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsComposerImageExpandedVisible(false);
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
        setIsComposerImageExpanded(false);
        setComposerImagePreviewAttachmentId(null);
        composerImagePreviewCloseTimerRef.current = null;
      }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isComposerImageExpanded]);

  const closeAttachModal = useCallback(() => {
    setIsAttachModalOpen(false);
  }, []);

  const focusComposerSelection = useCallback(
    (selectionStart: number, selectionEnd = selectionStart) => {
      requestAnimationFrame(() => {
        const textarea = messageInputRef.current;
        if (!textarea) return;

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [messageInputRef]
  );

  const clearAttachmentPasteState = useCallback(() => {
    attachmentPasteValidationScopeRef.current += 1;
    setAttachmentPastePrompt(null);
    setPastedAttachmentCandidates([]);
    setRawAttachmentUrl(null);
  }, []);

  const dismissAttachmentPastePrompt = useCallback(
    (preserveRawLink = false) => {
      if (
        attachmentPastePrompt &&
        attachmentPastePrompt.isAttachmentCandidate &&
        preserveRawLink
      ) {
        setRawAttachmentUrl(attachmentPastePrompt.url);
      }

      setAttachmentPastePrompt(null);
    },
    [attachmentPastePrompt]
  );

  const handleAttachButtonClick = useCallback(() => {
    if (isAttachModalOpen) {
      closeAttachModal();
      return;
    }

    closeMessageMenu();
    setIsAttachModalOpen(true);
  }, [closeAttachModal, closeMessageMenu, isAttachModalOpen]);

  const removeLoadingComposerAttachment = useCallback(
    (attachmentId: string) => {
      const nextAttachments = loadingComposerAttachmentsRef.current.filter(
        attachment => attachment.id !== attachmentId
      );
      loadingComposerAttachmentsRef.current = nextAttachments;
      setLoadingComposerAttachments(nextAttachments);
    },
    []
  );

  const abortAllPendingPdfCompressionRequests = useCallback(() => {
    for (const abortController of pdfCompressionAbortControllersRef.current.values()) {
      abortController.abort();
    }
    pdfCompressionAbortControllersRef.current.clear();
  }, []);

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

      loadingComposerAttachmentsRef.current = nextAttachments;
      setLoadingComposerAttachments(nextAttachments);
      return true;
    },
    []
  );

  const buildLoadingComposerAttachment = useCallback(
    (
      sourceUrl: string,
      options?: {
        fileName?: string;
        replaceAttachmentId?: string | null;
        loadingKind?: LoadingComposerAttachment['loadingKind'];
        loadingPhase?: LoadingComposerAttachment['loadingPhase'];
      }
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
          // Ignore invalid URLs and keep fallback label.
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
    (
      sourceUrl: string,
      options?: {
        fileName?: string;
        replaceAttachmentId?: string | null;
        loadingKind?: LoadingComposerAttachment['loadingKind'];
        loadingPhase?: LoadingComposerAttachment['loadingPhase'];
      }
    ) => {
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
        loadingComposerAttachments.length -
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
      const nextAttachments = [
        ...loadingComposerAttachmentsRef.current,
        loadingAttachment,
      ];
      loadingComposerAttachmentsRef.current = nextAttachments;
      setLoadingComposerAttachments(nextAttachments);
      return loadingAttachment;
    },
    [
      buildLoadingComposerAttachment,
      editingMessageId,
      loadingComposerAttachments.length,
      pendingComposerAttachments,
    ]
  );

  const removePendingComposerAttachment = useCallback(
    (attachmentId: string) => {
      removePendingComposerAttachmentFromQueue(attachmentId);
      setComposerImagePreviewAttachmentId(currentId =>
        currentId === attachmentId ? null : currentId
      );
      replaceComposerImageAttachmentIdRef.current =
        replaceComposerImageAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerImageAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current =
        replaceComposerDocumentAttachmentIdRef.current === attachmentId
          ? null
          : replaceComposerDocumentAttachmentIdRef.current;
    },
    [removePendingComposerAttachmentFromQueue]
  );

  const clearPendingComposerAttachments = useCallback(() => {
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    setIsComposerImageExpandedVisible(false);
    setIsComposerImageExpanded(false);
    setComposerImagePreviewAttachmentId(null);
    replaceComposerImageAttachmentIdRef.current = null;
    replaceComposerDocumentAttachmentIdRef.current = null;
    abortAllPendingPdfCompressionRequests();
    loadingComposerAttachmentsRef.current = [];
    setLoadingComposerAttachments([]);
    clearAttachmentPasteState();
    clearPendingComposerAttachmentsFromQueue();
  }, [
    abortAllPendingPdfCompressionRequests,
    clearAttachmentPasteState,
    clearPendingComposerAttachmentsFromQueue,
  ]);

  const closeComposerImagePreview = useCallback(() => {
    setIsComposerImageExpandedVisible(false);
    if (composerImagePreviewCloseTimerRef.current) {
      window.clearTimeout(composerImagePreviewCloseTimerRef.current);
      composerImagePreviewCloseTimerRef.current = null;
    }
    composerImagePreviewCloseTimerRef.current = window.setTimeout(() => {
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      composerImagePreviewCloseTimerRef.current = null;
    }, COMPOSER_IMAGE_PREVIEW_EXIT_DURATION);
  }, []);

  const openComposerImagePreview = useCallback(
    (attachmentId: string) => {
      const targetAttachment = pendingComposerAttachments.find(
        attachment =>
          attachment.id === attachmentId && attachment.fileKind === 'image'
      );
      if (!targetAttachment) return;

      closeAttachModal();
      closeMessageMenu();
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
      setComposerImagePreviewAttachmentId(attachmentId);
      setIsComposerImageExpanded(true);
      window.requestAnimationFrame(() => {
        setIsComposerImageExpandedVisible(true);
      });
    },
    [closeAttachModal, closeMessageMenu, pendingComposerAttachments]
  );

  const restorePendingComposerAttachments = useCallback(
    (attachments: PendingComposerAttachment[]) => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }

      setIsComposerImageExpandedVisible(false);
      setIsComposerImageExpanded(false);
      setComposerImagePreviewAttachmentId(null);
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      abortAllPendingPdfCompressionRequests();
      loadingComposerAttachmentsRef.current = [];
      setLoadingComposerAttachments([]);
      clearAttachmentPasteState();
      restorePendingComposerAttachmentsFromQueue(attachments);
    },
    [
      abortAllPendingPdfCompressionRequests,
      clearAttachmentPasteState,
      restorePendingComposerAttachmentsFromQueue,
    ]
  );

  const handleAttachImageClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = replaceAttachmentId ?? null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      closeAttachModal();
      imageInputRef.current?.click();
    },
    [closeAttachModal]
  );

  const handleAttachDocumentClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current =
        replaceAttachmentId ?? null;
      closeAttachModal();
      documentInputRef.current?.click();
    },
    [closeAttachModal]
  );

  const handleAttachAudioClick = useCallback(() => {
    closeAttachModal();
    replaceComposerImageAttachmentIdRef.current = null;
    replaceComposerDocumentAttachmentIdRef.current = null;
    audioInputRef.current?.click();
  }, [closeAttachModal]);

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;

      const replaceAttachmentId = replaceComposerImageAttachmentIdRef.current;
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerImage(
          selectedFile,
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) break;
      }
    },
    [queueComposerImage]
  );

  const handleDocumentFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;

      const replaceAttachmentId =
        replaceComposerDocumentAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerFile(
          selectedFile,
          'document',
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined
        );
        if (!didQueue) break;
      }
    },
    [queueComposerFile]
  );

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (selectedFiles.length === 0) return;
      replaceComposerDocumentAttachmentIdRef.current = null;
      for (const selectedFile of selectedFiles) {
        const didQueue = queueComposerFile(selectedFile, 'audio');
        if (!didQueue) break;
      }
    },
    [queueComposerFile]
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

      const result = await chatPdfCompressService.compressPdf(
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

  const handleComposerPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find(item =>
        item.type.startsWith('image/')
      );
      if (imageItem) {
        const imageFile = imageItem.getAsFile();
        if (!imageFile) return;

        event.preventDefault();
        closeAttachModal();
        closeMessageMenu();
        clearAttachmentPasteState();
        queueComposerImage(imageFile);
        return;
      }

      const pastedLink = extractComposerLinkFromClipboard({
        html: event.clipboardData.getData('text/html'),
        text: event.clipboardData.getData('text/plain'),
      });
      if (!pastedLink) return;

      event.preventDefault();
      closeAttachModal();
      closeMessageMenu();
      setRawAttachmentUrl(null);

      const textarea = event.currentTarget;
      const pastedText = pastedLink.pastedText;
      const rangeStart = textarea.selectionStart ?? textarea.value.length;
      const rangeEnd = textarea.selectionEnd ?? rangeStart;
      const nextMessage =
        textarea.value.slice(0, rangeStart) +
        pastedText +
        textarea.value.slice(rangeEnd);
      const insertedRangeEnd = rangeStart + pastedText.length;

      setAttachmentPastePrompt(null);
      setMessage(nextMessage);
      focusComposerSelection(insertedRangeEnd);

      const candidateId = `attachment_link_candidate_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const attachmentCandidate = {
        id: candidateId,
        pastedText,
        url: pastedLink.url,
      };
      attachmentPasteValidationScopeRef.current += 1;
      const validationScope = attachmentPasteValidationScopeRef.current;

      if (pastedLink.source === 'attachment') {
        setPastedAttachmentCandidates(currentCandidates => [
          ...currentCandidates,
          attachmentCandidate,
        ]);
        return;
      }

      void (async () => {
        const isAttachmentCandidate = await validateAttachmentComposerLink(
          pastedLink.url
        );
        if (
          !isAttachmentCandidate ||
          validationScope !== attachmentPasteValidationScopeRef.current
        ) {
          return;
        }

        setPastedAttachmentCandidates(currentCandidates => {
          if (
            currentCandidates.some(candidate => candidate.id === candidateId)
          ) {
            return currentCandidates;
          }

          return [...currentCandidates, attachmentCandidate];
        });
        setAttachmentPastePrompt(currentPrompt => {
          if (
            !currentPrompt ||
            currentPrompt.url !== pastedLink.url ||
            currentPrompt.pastedText !== pastedText ||
            currentPrompt.rangeStart !== rangeStart ||
            currentPrompt.rangeEnd !== insertedRangeEnd
          ) {
            return currentPrompt;
          }

          return {
            ...currentPrompt,
            id: candidateId,
            isAttachmentCandidate: true,
          };
        });
      })();
    },
    [
      clearAttachmentPasteState,
      closeAttachModal,
      closeMessageMenu,
      focusComposerSelection,
      queueComposerImage,
      setMessage,
    ]
  );

  const handleUseAttachmentPasteAsUrl = useCallback(() => {
    if (!attachmentPastePrompt?.isAttachmentCandidate) return;

    setRawAttachmentUrl(attachmentPastePrompt.url);
    dismissAttachmentPastePrompt();
    focusComposerSelection(attachmentPastePrompt.rangeEnd);
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleEditAttachmentLink = useCallback(
    (
      candidate: HoverableAttachmentCandidate,
      selection?: {
        selectionStart: number;
        selectionEnd?: number;
      }
    ) => {
      setRawAttachmentUrl(candidate.url);
      setAttachmentPastePrompt(null);
      focusComposerSelection(
        selection?.selectionStart ?? candidate.rangeStart,
        selection?.selectionEnd ?? candidate.rangeEnd
      );
    },
    [focusComposerSelection]
  );

  const handleOpenAttachmentPastePromptLink = useCallback(() => {
    if (!attachmentPastePrompt) return;

    openInNewTab(attachmentPastePrompt.url);
    dismissAttachmentPastePrompt();
    focusComposerSelection(attachmentPastePrompt.rangeEnd);
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleCopyAttachmentPastePromptLink = useCallback(async () => {
    if (!attachmentPastePrompt) return;

    try {
      await navigator.clipboard.writeText(attachmentPastePrompt.url);
      toast.success('Link berhasil disalin', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    } catch (error) {
      console.error('Error copying attachment composer link:', error);
      toast.error('Gagal menyalin link', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    }

    dismissAttachmentPastePrompt();
    focusComposerSelection(attachmentPastePrompt.rangeEnd);
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleShortenAttachmentPastePromptLink = useCallback(async () => {
    if (!attachmentPastePrompt) return;

    const promptState = attachmentPastePrompt;
    const storagePath = extractChatStoragePath(promptState.url)?.trim();

    const sharedLinkResult = await chatSidebarShareGateway.createSharedLink(
      storagePath
        ? { storagePath }
        : {
            targetUrl: promptState.url,
          }
    );
    const shortUrl = sharedLinkResult.data?.shortUrl?.trim() || null;

    if (!shortUrl) {
      toast.error(sharedLinkResult.error?.message || 'Gagal memendekkan link', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    setMessage(currentMessage => {
      const pastedSegment = currentMessage.slice(
        promptState.rangeStart,
        promptState.rangeEnd
      );
      if (pastedSegment !== promptState.pastedText) {
        return currentMessage;
      }

      return (
        currentMessage.slice(0, promptState.rangeStart) +
        shortUrl +
        currentMessage.slice(promptState.rangeEnd)
      );
    });
    setPastedAttachmentCandidates(currentCandidates =>
      currentCandidates.map(candidate =>
        candidate.id === promptState.id
          ? {
              ...candidate,
              pastedText: shortUrl,
              url: shortUrl,
            }
          : candidate
      )
    );
    setRawAttachmentUrl(null);
    dismissAttachmentPastePrompt();
    focusComposerSelection(promptState.rangeStart + shortUrl.length);
    toast.success('Link berhasil dipendekkan', {
      toasterId: CHAT_SIDEBAR_TOASTER_ID,
    });
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
    setMessage,
  ]);

  const handleUseAttachmentPasteAsAttachment = useCallback(() => {
    if (!attachmentPastePrompt?.isAttachmentCandidate) return;

    const promptState = attachmentPastePrompt;
    const restoreCandidateIndex = pastedAttachmentCandidates.findIndex(
      candidate => candidate.id === promptState.id
    );
    const loadingAttachment = queueLoadingComposerAttachment(promptState.url);

    setAttachmentPastePrompt(null);
    setRawAttachmentUrl(null);

    if (!loadingAttachment) {
      focusComposerSelection(promptState.rangeEnd);
      return;
    }

    setMessage(currentMessage => {
      const pastedSegment = currentMessage.slice(
        promptState.rangeStart,
        promptState.rangeEnd
      );
      if (pastedSegment !== promptState.pastedText) {
        return currentMessage;
      }

      return (
        currentMessage.slice(0, promptState.rangeStart) +
        currentMessage.slice(promptState.rangeEnd)
      );
    });
    setPastedAttachmentCandidates(currentCandidates =>
      currentCandidates.filter(candidate => candidate.id !== promptState.id)
    );
    focusComposerSelection(promptState.rangeStart);

    void (async () => {
      const didQueue = await queueAttachmentComposerLink(
        promptState.url,
        loadingAttachment
      );
      if (!didQueue) {
        setMessage(currentMessage => {
          const safeRangeStart = Math.min(
            promptState.rangeStart,
            currentMessage.length
          );
          const currentSegment = currentMessage.slice(
            safeRangeStart,
            safeRangeStart + promptState.pastedText.length
          );
          if (currentSegment === promptState.pastedText) {
            return currentMessage;
          }

          return (
            currentMessage.slice(0, safeRangeStart) +
            promptState.pastedText +
            currentMessage.slice(safeRangeStart)
          );
        });
        setPastedAttachmentCandidates(currentCandidates => {
          if (
            currentCandidates.some(candidate => candidate.id === promptState.id)
          ) {
            return currentCandidates;
          }

          const nextCandidates = [...currentCandidates];
          nextCandidates.splice(
            restoreCandidateIndex < 0
              ? currentCandidates.length
              : Math.min(restoreCandidateIndex, currentCandidates.length),
            0,
            {
              id: promptState.id,
              pastedText: promptState.pastedText,
              url: promptState.url,
            }
          );
          return nextCandidates;
        });
        focusComposerSelection(promptState.rangeEnd);
        return;
      }
    })();
  }, [
    attachmentPastePrompt,
    focusComposerSelection,
    pastedAttachmentCandidates,
    queueAttachmentComposerLink,
    queueLoadingComposerAttachment,
    setMessage,
  ]);

  const openAttachmentPastePrompt = useCallback(
    (candidate?: HoverableAttachmentCandidate) => {
      const resolvedCandidate =
        candidate ??
        (hoverableAttachmentCandidates.length === 1
          ? hoverableAttachmentCandidates[0]
          : null);
      if (!resolvedCandidate) return;

      setAttachmentPastePrompt({
        id: resolvedCandidate.id,
        isAttachmentCandidate: true,
        url: resolvedCandidate.url,
        pastedText: resolvedCandidate.pastedText,
        rangeStart: resolvedCandidate.rangeStart,
        rangeEnd: resolvedCandidate.rangeEnd,
      });
    },
    [hoverableAttachmentCandidates]
  );

  const openComposerLinkPrompt = useCallback((link: ComposerPromptableLink) => {
    setAttachmentPastePrompt({
      id: `composer_link_prompt_${link.rangeStart}_${link.rangeEnd}`,
      isAttachmentCandidate: false,
      url: link.url,
      pastedText: link.pastedText,
      rangeStart: link.rangeStart,
      rangeEnd: link.rangeEnd,
    });
  }, []);

  useEffect(() => {
    if (!isAttachModalOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) return;
      if (eventTarget instanceof Element) {
        const profileLayer = eventTarget.closest(
          '[data-profile-trigger="true"], [data-profile-portal="true"]'
        );
        if (profileLayer) return;
      }

      if (attachModalRef.current?.contains(eventTarget)) return;
      if (attachButtonRef.current?.contains(eventTarget)) return;

      closeAttachModal();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAttachModal();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAttachModal, isAttachModalOpen]);

  useEffect(() => {
    if (!attachmentPastePrompt) return;

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) return;

      if (attachmentPastePromptRef.current?.contains(eventTarget)) return;
      if (messageInputRef.current?.contains(eventTarget)) return;

      dismissAttachmentPastePrompt(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismissAttachmentPastePrompt(true);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismissAttachmentPastePrompt, attachmentPastePrompt, messageInputRef]);

  useEffect(() => {
    return () => {
      if (composerImagePreviewCloseTimerRef.current) {
        window.clearTimeout(composerImagePreviewCloseTimerRef.current);
        composerImagePreviewCloseTimerRef.current = null;
      }
    };
  }, []);

  return {
    isAttachModalOpen,
    pendingComposerAttachments,
    composerAttachmentPreviewItems,
    loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments:
      loadingComposerAttachments.length > 0,
    attachmentPastePromptUrl: attachmentPastePrompt?.url ?? null,
    isAttachmentPastePromptAttachmentCandidate:
      attachmentPastePrompt?.isAttachmentCandidate ?? false,
    isAttachmentPastePromptShortenable,
    hoverableAttachmentCandidates,
    hoverableAttachmentUrl,
    rawAttachmentUrl,
    previewComposerImageAttachment,
    isComposerImageExpanded,
    isComposerImageExpandedVisible,
    attachButtonRef,
    attachModalRef,
    attachmentPastePromptRef,
    imageInputRef,
    documentInputRef,
    audioInputRef,
    pendingImagePreviewUrlsRef,
    closeAttachModal,
    clearAttachmentPasteState,
    dismissAttachmentPastePrompt,
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleAttachButtonClick,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
    handleComposerPaste,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
    openComposerImagePreview,
    closeComposerImagePreview,
    removePendingComposerAttachment,
    clearPendingComposerAttachments,
    restorePendingComposerAttachments,
    cancelLoadingComposerAttachment,
    queueComposerImage,
    compressPendingComposerImage,
    compressPendingComposerPdf,
  };
};
