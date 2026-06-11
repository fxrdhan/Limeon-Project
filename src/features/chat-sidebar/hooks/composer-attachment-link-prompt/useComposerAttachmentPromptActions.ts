import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { extractChatStoragePath } from '../../../../../shared/chatStoragePaths';
import { CHAT_SIDEBAR_TOASTER_ID } from '../../constants';
import { chatSidebarShareGateway } from '../../data/chatSidebarGateway';
import type {
  ComposerHoverableAttachmentCandidate,
  ComposerPromptableLink,
  LoadingComposerAttachment,
} from '../../types';
import { copyTextToClipboard } from '../../utils/clipboard';
import type { AttachmentComposerRemoteFile } from '../../utils/composer-attachment-link';
import { extractAttachmentComposerLinkFromMessageText } from '../../utils/composer-attachment-link';
import { openInNewTab } from '../../utils/message-file';
import {
  buildAttachmentPastePrompt,
  buildComposerLinkPromptState,
  replacePromptRangeWithText,
  type AttachmentPastePromptState,
  type PastedAttachmentCandidate,
} from '../../utils/composerAttachmentPrompt';

interface UseComposerAttachmentPromptActionsProps {
  attachmentPastePrompt: AttachmentPastePromptState | null;
  dismissAttachmentPastePrompt: (preserveRawLink?: boolean) => void;
  focusComposerSelection: (
    selectionStart: number,
    selectionEnd?: number
  ) => void;
  hoverableAttachmentCandidates: ComposerHoverableAttachmentCandidate[];
  pastedAttachmentCandidates: PastedAttachmentCandidate[];
  queueAttachmentComposerLink: (
    attachmentLink: string,
    loadingAttachment: LoadingComposerAttachment,
    prefetchedRemoteFile?: AttachmentComposerRemoteFile | null
  ) => Promise<boolean>;
  queueLoadingComposerAttachment: (
    sourceUrl: string,
    options?: {
      fileName?: string;
      replaceAttachmentId?: string | null;
      loadingKind?: LoadingComposerAttachment['loadingKind'];
      loadingPhase?: LoadingComposerAttachment['loadingPhase'];
    }
  ) => LoadingComposerAttachment | null;
  setAttachmentPastePrompt: Dispatch<
    SetStateAction<AttachmentPastePromptState | null>
  >;
  setMessage: Dispatch<SetStateAction<string>>;
  setPastedAttachmentCandidates: Dispatch<
    SetStateAction<PastedAttachmentCandidate[]>
  >;
  setRawAttachmentUrl: Dispatch<SetStateAction<string | null>>;
  validatedAttachmentRemoteFilesRef: MutableRefObject<
    Map<string, AttachmentComposerRemoteFile>
  >;
}

export const useComposerAttachmentPromptActions = ({
  attachmentPastePrompt,
  dismissAttachmentPastePrompt,
  focusComposerSelection,
  hoverableAttachmentCandidates,
  pastedAttachmentCandidates,
  queueAttachmentComposerLink,
  queueLoadingComposerAttachment,
  setAttachmentPastePrompt,
  setMessage,
  setPastedAttachmentCandidates,
  setRawAttachmentUrl,
  validatedAttachmentRemoteFilesRef,
}: UseComposerAttachmentPromptActionsProps) => {
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
    setRawAttachmentUrl,
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
    [focusComposerSelection, setAttachmentPastePrompt, setRawAttachmentUrl]
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
      await copyTextToClipboard(attachmentPastePrompt.url);
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
    setPastedAttachmentCandidates,
    setRawAttachmentUrl,
  ]);

  const handleUseAttachmentPasteAsAttachment = useCallback(() => {
    if (!attachmentPastePrompt?.isAttachmentCandidate) {
      return;
    }

    const promptState = attachmentPastePrompt;
    const prefetchedRemoteFile =
      validatedAttachmentRemoteFilesRef.current.get(promptState.id) ?? null;
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
        loadingAttachment,
        prefetchedRemoteFile
      );
      if (didQueue) {
        validatedAttachmentRemoteFilesRef.current.delete(promptState.id);
        return;
      }

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
    })();
  }, [
    attachmentPastePrompt,
    focusComposerSelection,
    pastedAttachmentCandidates,
    queueAttachmentComposerLink,
    queueLoadingComposerAttachment,
    setAttachmentPastePrompt,
    setMessage,
    setPastedAttachmentCandidates,
    setRawAttachmentUrl,
    validatedAttachmentRemoteFilesRef,
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
    [hoverableAttachmentCandidates, setAttachmentPastePrompt]
  );

  const openComposerLinkPrompt = useCallback(
    (link: ComposerPromptableLink) => {
      setAttachmentPastePrompt(
        buildComposerLinkPromptState(
          link,
          extractAttachmentComposerLinkFromMessageText(link.url) !== null
        )
      );
    },
    [setAttachmentPastePrompt]
  );

  return {
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
  };
};
