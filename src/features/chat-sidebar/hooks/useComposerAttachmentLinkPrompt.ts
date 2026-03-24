import type {
  Dispatch,
  SetStateAction,
  ClipboardEvent,
  RefObject,
} from 'react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { extractChatStoragePath } from '../../../../shared/chatStoragePaths';
import { chatSidebarShareGateway } from '../data/chatSidebarGateway';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { openInNewTab } from '../utils/message-file';
import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPromptableLink,
  LoadingComposerAttachment,
} from '../types';
import {
  extractAttachmentComposerLinkFromMessageText,
  extractComposerLinkFromClipboard,
  isChatSharedLinkUrl,
  validateAttachmentComposerLink,
} from '../utils/composer-attachment-link';
import {
  buildAttachmentPastePrompt,
  buildComposerLinkPromptState,
  buildHoverableAttachmentCandidates,
  createAttachmentPasteCandidateId,
  replacePromptRangeWithText,
  type AttachmentPastePromptState,
  type PastedAttachmentCandidate,
} from '../utils/composerAttachmentPrompt';

interface UseComposerAttachmentLinkPromptProps {
  closeAttachModal: () => void;
  closeMessageMenu: () => void;
  message: string;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  queueAttachmentComposerLink: (
    attachmentLink: string,
    loadingAttachment: LoadingComposerAttachment
  ) => Promise<boolean>;
  queueComposerImage: (file: File) => boolean;
  queueLoadingComposerAttachment: (
    sourceUrl: string,
    options?: {
      fileName?: string;
      replaceAttachmentId?: string | null;
      loadingKind?: LoadingComposerAttachment['loadingKind'];
      loadingPhase?: LoadingComposerAttachment['loadingPhase'];
    }
  ) => LoadingComposerAttachment | null;
  setMessage: Dispatch<SetStateAction<string>>;
  resetKey?: string | null;
}

export const useComposerAttachmentLinkPrompt = ({
  closeAttachModal,
  closeMessageMenu,
  message,
  messageInputRef,
  queueAttachmentComposerLink,
  queueComposerImage,
  queueLoadingComposerAttachment,
  setMessage,
  resetKey,
}: UseComposerAttachmentLinkPromptProps) => {
  const attachmentPastePromptRef = useRef<HTMLDivElement>(null);
  const attachmentPasteValidationScopeRef = useRef(0);
  const [attachmentPastePrompt, setAttachmentPastePrompt] =
    useState<AttachmentPastePromptState | null>(null);
  const [pastedAttachmentCandidates, setPastedAttachmentCandidates] = useState<
    PastedAttachmentCandidate[]
  >([]);
  const [rawAttachmentUrl, setRawAttachmentUrl] = useState<string | null>(null);

  const focusComposerSelection = useCallback(
    (selectionStart: number, selectionEnd = selectionStart) => {
      requestAnimationFrame(() => {
        const textarea = messageInputRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [messageInputRef]
  );

  const hoverableAttachmentCandidates = useMemo(
    () =>
      buildHoverableAttachmentCandidates(message, pastedAttachmentCandidates),
    [message, pastedAttachmentCandidates]
  );

  const hoverableAttachmentUrl =
    hoverableAttachmentCandidates.length === 1
      ? (hoverableAttachmentCandidates[0]?.url ?? null)
      : null;
  const isAttachmentPastePromptShortenable =
    Boolean(extractChatStoragePath(attachmentPastePrompt?.url ?? '')) &&
    !isChatSharedLinkUrl(attachmentPastePrompt?.url ?? '');

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

  const handleComposerPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find(item =>
        item.type.startsWith('image/')
      );
      if (imageItem) {
        const imageFile = imageItem.getAsFile();
        if (!imageFile) {
          return;
        }

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
      if (!pastedLink) {
        return;
      }

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

      const candidateId = createAttachmentPasteCandidateId();
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

          return buildAttachmentPastePrompt({
            candidate: {
              ...currentPrompt,
              id: candidateId,
            },
            isAttachmentCandidate: true,
          });
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
    if (!attachmentPastePrompt?.isAttachmentCandidate) {
      return;
    }

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
      candidate: ComposerHoverableAttachmentCandidate,
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
    if (!attachmentPastePrompt) {
      return;
    }

    openInNewTab(attachmentPastePrompt.url);
    dismissAttachmentPastePrompt();
    focusComposerSelection(attachmentPastePrompt.rangeEnd);
  }, [
    attachmentPastePrompt,
    dismissAttachmentPastePrompt,
    focusComposerSelection,
  ]);

  const handleCopyAttachmentPastePromptLink = useCallback(async () => {
    if (!attachmentPastePrompt) {
      return;
    }

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
    if (!attachmentPastePrompt) {
      return;
    }

    const promptState = attachmentPastePrompt;
    const storagePath = extractChatStoragePath(promptState.url)?.trim();
    if (!storagePath) {
      toast.error('Hanya link attachment chat yang bisa dipendekkan', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const sharedLinkResult = await chatSidebarShareGateway.createSharedLink({
      storagePath,
    });
    const shortUrl = sharedLinkResult.data?.shortUrl?.trim() || null;

    if (!shortUrl) {
      toast.error(sharedLinkResult.error?.message || 'Gagal memendekkan link', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    setMessage(currentMessage =>
      replacePromptRangeWithText({
        currentMessage,
        promptState,
        nextText: shortUrl,
      })
    );
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
    if (!attachmentPastePrompt?.isAttachmentCandidate) {
      return;
    }

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

    setMessage(currentMessage =>
      replacePromptRangeWithText({
        currentMessage,
        promptState,
        nextText: '',
      })
    );
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
    (candidate?: ComposerHoverableAttachmentCandidate) => {
      const resolvedCandidate =
        candidate ??
        (hoverableAttachmentCandidates.length === 1
          ? hoverableAttachmentCandidates[0]
          : null);
      if (!resolvedCandidate) {
        return;
      }

      setAttachmentPastePrompt(
        buildAttachmentPastePrompt({
          candidate: resolvedCandidate,
          isAttachmentCandidate: true,
        })
      );
    },
    [hoverableAttachmentCandidates]
  );

  const openComposerLinkPrompt = useCallback((link: ComposerPromptableLink) => {
    setAttachmentPastePrompt(
      buildComposerLinkPromptState(
        link,
        extractAttachmentComposerLinkFromMessageText(link.url) !== null
      )
    );
  }, []);

  useLayoutEffect(() => {
    clearAttachmentPasteState();
  }, [clearAttachmentPasteState, resetKey]);

  useEffect(() => {
    if (!attachmentPastePrompt) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (attachmentPastePromptRef.current?.contains(eventTarget)) {
        return;
      }
      if (messageInputRef.current?.contains(eventTarget)) {
        return;
      }

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

  return {
    attachmentPastePromptRef,
    attachmentPastePromptUrl: attachmentPastePrompt?.url ?? null,
    isAttachmentPastePromptAttachmentCandidate:
      attachmentPastePrompt?.isAttachmentCandidate ?? false,
    isAttachmentPastePromptShortenable,
    hoverableAttachmentCandidates,
    hoverableAttachmentUrl,
    rawAttachmentUrl,
    clearAttachmentPasteState,
    dismissAttachmentPastePrompt,
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleComposerPaste,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
    resetComposerLinkPromptState: clearAttachmentPasteState,
  };
};
