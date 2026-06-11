import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { AttachmentPastePromptState } from '../../utils/composerAttachmentPrompt';

interface UseAttachmentPastePromptDismissalProps {
  attachmentPastePrompt: AttachmentPastePromptState | null;
  attachmentPastePromptRef: RefObject<HTMLDivElement | null>;
  dismissAttachmentPastePrompt: (preserveRawLink?: boolean) => void;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
}

export const useAttachmentPastePromptDismissal = ({
  attachmentPastePrompt,
  attachmentPastePromptRef,
  dismissAttachmentPastePrompt,
  messageInputRef,
}: UseAttachmentPastePromptDismissalProps) => {
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
  }, [
    attachmentPastePrompt,
    attachmentPastePromptRef,
    dismissAttachmentPastePrompt,
    messageInputRef,
  ]);
};
