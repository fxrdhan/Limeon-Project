import { useCallback, useMemo, useRef, useState } from 'react';
import { extractChatStoragePath } from '../../../../../shared/chatStoragePaths';
import type { AttachmentComposerRemoteFile } from '../../utils/composer-attachment-link';
import { isChatSharedLinkUrl } from '../../utils/composer-attachment-link';
import {
  buildHoverableAttachmentCandidates,
  type AttachmentPastePromptState,
  type PastedAttachmentCandidate,
} from '../../utils/composerAttachmentPrompt';

export const useComposerAttachmentPromptState = (message: string) => {
  const attachmentPastePromptRef = useRef<HTMLDivElement>(null);
  const attachmentPasteValidationScopeRef = useRef(0);
  const validatedAttachmentRemoteFilesRef = useRef(
    new Map<string, AttachmentComposerRemoteFile>()
  );
  const [attachmentPastePrompt, setAttachmentPastePrompt] =
    useState<AttachmentPastePromptState | null>(null);
  const [pastedAttachmentCandidates, setPastedAttachmentCandidates] = useState<
    PastedAttachmentCandidate[]
  >([]);
  const [rawAttachmentUrl, setRawAttachmentUrl] = useState<string | null>(null);

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
    validatedAttachmentRemoteFilesRef.current.clear();
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

  return {
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
  };
};
