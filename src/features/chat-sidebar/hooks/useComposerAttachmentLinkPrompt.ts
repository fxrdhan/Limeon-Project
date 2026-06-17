import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useLayoutEffect } from 'react';
import type { LoadingComposerAttachment } from '../types';
import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';
import { useAttachmentPastePromptDismissal } from './composer-attachment-link-prompt/useAttachmentPastePromptDismissal';
import { useComposerAttachmentPasteHandler } from './composer-attachment-link-prompt/useComposerAttachmentPasteHandler';
import { useComposerAttachmentPromptActions } from './composer-attachment-link-prompt/useComposerAttachmentPromptActions';
import { useComposerAttachmentPromptState } from './composer-attachment-link-prompt/useComposerAttachmentPromptState';
import { useComposerPromptFocus } from './composer-attachment-link-prompt/useComposerPromptFocus';

interface UseComposerAttachmentLinkPromptProps {
  closeAttachModal: () => void;
  closeMessageMenu: () => void;
  message: string;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  queueAttachmentComposerLink: (
    attachmentLink: string,
    loadingAttachment: LoadingComposerAttachment,
    prefetchedRemoteFile?: AttachmentComposerRemoteFile | null
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
  const {
    attachmentPastePromptRef,
    attachmentPasteValidationScopeRef,
    validatedAttachmentRemoteFilesRef,
    attachmentPastePrompt,
    setAttachmentPastePrompt,
    pastedAttachmentCandidates,
    setPastedAttachmentCandidates,
    rawAttachmentUrl,
    setRawAttachmentUrl,
    hoverableAttachmentCandidates,
    hoverableAttachmentUrl,
    isAttachmentPastePromptShortenable,
    clearAttachmentPasteState,
    dismissAttachmentPastePrompt,
  } = useComposerAttachmentPromptState(message);
  const focusComposerSelection = useComposerPromptFocus(
    messageInputRef,
    resetKey
  );
  const handleComposerPaste = useComposerAttachmentPasteHandler({
    attachmentPasteValidationScopeRef,
    clearAttachmentPasteState,
    closeAttachModal,
    closeMessageMenu,
    focusComposerSelection,
    queueComposerImage,
    setAttachmentPastePrompt,
    setMessage,
    setPastedAttachmentCandidates,
    setRawAttachmentUrl,
    validatedAttachmentRemoteFilesRef,
  });
  const {
    openAttachmentPastePrompt,
    openComposerLinkPrompt,
    handleEditAttachmentLink,
    handleOpenAttachmentPastePromptLink,
    handleCopyAttachmentPastePromptLink,
    handleShortenAttachmentPastePromptLink,
    handleUseAttachmentPasteAsUrl,
    handleUseAttachmentPasteAsAttachment,
  } = useComposerAttachmentPromptActions({
    attachmentPastePrompt,
    attachmentPasteValidationScopeRef,
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
  });

  useLayoutEffect(() => {
    clearAttachmentPasteState();
  }, [clearAttachmentPasteState, resetKey]);

  useAttachmentPastePromptDismissal({
    attachmentPastePrompt,
    attachmentPastePromptRef,
    dismissAttachmentPastePrompt,
    messageInputRef,
  });

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
