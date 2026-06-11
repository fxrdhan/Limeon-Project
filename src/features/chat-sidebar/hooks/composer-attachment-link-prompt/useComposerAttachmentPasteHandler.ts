import type {
  ClipboardEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { useCallback } from 'react';
import type { AttachmentComposerRemoteFile } from '../../utils/composer-attachment-link';
import {
  extractComposerLinkFromClipboard,
  fetchAttachmentComposerRemoteFile,
} from '../../utils/composer-attachment-link';
import {
  buildAttachmentPastePrompt,
  createAttachmentPasteCandidateId,
  type AttachmentPastePromptState,
  type PastedAttachmentCandidate,
} from '../../utils/composerAttachmentPrompt';

interface UseComposerAttachmentPasteHandlerProps {
  attachmentPasteValidationScopeRef: MutableRefObject<number>;
  clearAttachmentPasteState: () => void;
  closeAttachModal: () => void;
  closeMessageMenu: () => void;
  focusComposerSelection: (
    selectionStart: number,
    selectionEnd?: number
  ) => void;
  queueComposerImage: (file: File) => boolean;
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

export const useComposerAttachmentPasteHandler = ({
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
}: UseComposerAttachmentPasteHandlerProps) =>
  useCallback(
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
        let attachmentRemoteFile: AttachmentComposerRemoteFile | null = null;
        try {
          attachmentRemoteFile = await fetchAttachmentComposerRemoteFile(
            pastedLink.url
          );
        } catch {
          return;
        }

        if (
          !attachmentRemoteFile ||
          validationScope !== attachmentPasteValidationScopeRef.current
        ) {
          return;
        }

        validatedAttachmentRemoteFilesRef.current.set(
          candidateId,
          attachmentRemoteFile
        );
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
            isAttachmentCandidate: Boolean(attachmentRemoteFile),
          });
        });
      })();
    },
    [
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
    ]
  );
