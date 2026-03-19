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
  extractAttachmentComposerLinkFromClipboard,
  fetchAttachmentComposerRemoteFile,
} from '../utils/composer-attachment-link';
import { useComposerPendingAttachments } from './useComposerPendingAttachments';

interface UseChatComposerAttachmentsProps {
  editingMessageId: string | null;
  closeMessageMenu: () => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
}

interface AttachmentPastePromptState {
  id: string;
  url: string;
  pastedText: string;
  rangeStart: number;
  rangeEnd: number;
}

interface PastedAttachmentCandidate {
  id: string;
  url: string;
}

interface HoverableAttachmentCandidate extends AttachmentPastePromptState {}

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
  } = useComposerPendingAttachments({
    editingMessageId,
    messageInputRef,
  });
  const [loadingComposerAttachments, setLoadingComposerAttachments] = useState<
    LoadingComposerAttachment[]
  >([]);
  const loadingComposerAttachmentsRef = useRef<LoadingComposerAttachment[]>([]);
  const [attachmentPastePrompt, setAttachmentPastePrompt] =
    useState<AttachmentPastePromptState | null>(null);
  const [pastedAttachmentCandidates, setPastedAttachmentCandidates] = useState<
    PastedAttachmentCandidate[]
  >([]);
  const [rawAttachmentUrl, setRawAttachmentUrl] = useState<string | null>(null);

  const previewComposerImageAttachment = pendingComposerAttachments.find(
    attachment =>
      attachment.id === composerImagePreviewAttachmentId &&
      attachment.fileKind === 'image'
  );
  const hoverableAttachmentCandidates = useMemo(() => {
    let searchStart = 0;

    return pastedAttachmentCandidates.flatMap(candidate => {
      const rangeStart = message.indexOf(candidate.url, searchStart);
      if (rangeStart < 0) {
        return [];
      }

      const rangeEnd = rangeStart + candidate.url.length;
      searchStart = rangeEnd;

      return [
        {
          id: candidate.id,
          url: candidate.url,
          pastedText: candidate.url,
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
    setAttachmentPastePrompt(null);
    setPastedAttachmentCandidates([]);
    setRawAttachmentUrl(null);
  }, []);

  const dismissAttachmentPastePrompt = useCallback(
    (preserveRawLink = false) => {
      if (attachmentPastePrompt && preserveRawLink) {
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

  const buildLoadingComposerAttachment = useCallback(
    (sourceUrl: string): LoadingComposerAttachment => {
      let fileName = 'Media dari link';

      try {
        const parsedUrl = new URL(sourceUrl);
        const rawFileName = parsedUrl.pathname.split('/').pop();
        if (rawFileName) {
          fileName = decodeURIComponent(rawFileName);
        }
      } catch {
        // Ignore invalid URLs and keep fallback label.
      }

      return {
        id: `loading_attachment_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        fileName,
        sourceUrl,
        status: 'loading',
      };
    },
    []
  );

  const queueLoadingComposerAttachment = useCallback(
    (sourceUrl: string) => {
      if (editingMessageId) {
        toast.error('Selesaikan edit pesan terlebih dahulu', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return null;
      }

      const currentAttachmentCount =
        pendingComposerAttachments.length + loadingComposerAttachments.length;
      if (currentAttachmentCount >= MAX_PENDING_COMPOSER_ATTACHMENTS) {
        toast.error(
          `Maksimal ${MAX_PENDING_COMPOSER_ATTACHMENTS} lampiran dalam satu kirim`,
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
        return null;
      }

      const loadingAttachment = buildLoadingComposerAttachment(sourceUrl);
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
      pendingComposerAttachments.length,
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
    loadingComposerAttachmentsRef.current = [];
    setLoadingComposerAttachments([]);
    clearAttachmentPasteState();
    clearPendingComposerAttachmentsFromQueue();
  }, [clearAttachmentPasteState, clearPendingComposerAttachmentsFromQueue]);

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
      loadingComposerAttachmentsRef.current = [];
      setLoadingComposerAttachments([]);
      clearAttachmentPasteState();
      restorePendingComposerAttachmentsFromQueue(attachments);
    },
    [clearAttachmentPasteState, restorePendingComposerAttachmentsFromQueue]
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

      const attachmentLink = extractAttachmentComposerLinkFromClipboard({
        html: event.clipboardData.getData('text/html'),
        text: event.clipboardData.getData('text/plain'),
      });
      if (!attachmentLink) return;

      event.preventDefault();
      closeAttachModal();
      closeMessageMenu();
      setPastedAttachmentCandidates(currentCandidates => [
        ...currentCandidates,
        {
          id: `attachment_link_candidate_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          url: attachmentLink.url,
        },
      ]);
      setRawAttachmentUrl(null);

      const textarea = event.currentTarget;
      const pastedText = attachmentLink.url;
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
    },
    [
      closeAttachModal,
      closeMessageMenu,
      clearAttachmentPasteState,
      focusComposerSelection,
      queueComposerImage,
      setMessage,
    ]
  );

  const handleUseAttachmentPasteAsUrl = useCallback(() => {
    if (!attachmentPastePrompt) return;

    setRawAttachmentUrl(attachmentPastePrompt.url);
    dismissAttachmentPastePrompt();
    focusComposerSelection(attachmentPastePrompt.rangeEnd);
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleEditAttachmentLink = useCallback(
    (candidate: HoverableAttachmentCandidate) => {
      setRawAttachmentUrl(candidate.url);
      setAttachmentPastePrompt(null);
      focusComposerSelection(candidate.rangeStart, candidate.rangeEnd);
    },
    [focusComposerSelection]
  );

  const handleOpenAttachmentPastePromptLink = useCallback(() => {
    if (!attachmentPastePrompt) return;

    openInNewTab(attachmentPastePrompt.url);
    dismissAttachmentPastePrompt();
    focusComposerSelection(
      attachmentPastePrompt.rangeStart,
      attachmentPastePrompt.rangeEnd
    );
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleUseAttachmentPasteAsAttachment = useCallback(() => {
    if (!attachmentPastePrompt) return;

    const promptState = attachmentPastePrompt;
    const loadingAttachment = queueLoadingComposerAttachment(promptState.url);

    setAttachmentPastePrompt(null);
    setRawAttachmentUrl(null);

    if (!loadingAttachment) {
      focusComposerSelection(promptState.rangeEnd);
      return;
    }

    void (async () => {
      const didQueue = await queueAttachmentComposerLink(
        promptState.url,
        loadingAttachment
      );
      if (!didQueue) {
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
    })();
  }, [
    attachmentPastePrompt,
    focusComposerSelection,
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
        url: resolvedCandidate.url,
        pastedText: resolvedCandidate.pastedText,
        rangeStart: resolvedCandidate.rangeStart,
        rangeEnd: resolvedCandidate.rangeEnd,
      });
    },
    [hoverableAttachmentCandidates]
  );

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
    loadingComposerAttachments,
    isLoadingAttachmentComposerAttachments:
      loadingComposerAttachments.length > 0,
    attachmentPastePromptUrl: attachmentPastePrompt?.url ?? null,
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
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
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
    queueComposerImage,
  };
};
