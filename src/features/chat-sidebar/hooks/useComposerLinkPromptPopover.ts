import { useCallback, useEffect, useRef, useState } from 'react';

const ATTACHMENT_LINK_PROMPT_MIN_WIDTH = 156;
const ATTACHMENT_LINK_PROMPT_EDGE_MARGIN = 16;
const ATTACHMENT_LINK_PROMPT_CLOSE_DELAY_MS = 160;

interface UseComposerLinkPromptPopoverProps {
  linkPromptUrl: string | null;
  onDismissAttachmentPastePrompt: () => void;
}

export const useComposerLinkPromptPopover = ({
  linkPromptUrl,
  onDismissAttachmentPastePrompt,
}: UseComposerLinkPromptPopoverProps) => {
  const attachmentPromptCloseTimerRef = useRef<number | null>(null);
  const [attachmentPromptPosition, setAttachmentPromptPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const clearAttachmentPromptCloseTimer = useCallback(() => {
    if (attachmentPromptCloseTimerRef.current === null) {
      return;
    }

    window.clearTimeout(attachmentPromptCloseTimerRef.current);
    attachmentPromptCloseTimerRef.current = null;
  }, []);

  const scheduleAttachmentPromptClose = useCallback(() => {
    clearAttachmentPromptCloseTimer();
    attachmentPromptCloseTimerRef.current = window.setTimeout(() => {
      onDismissAttachmentPastePrompt();
      setAttachmentPromptPosition(null);
      attachmentPromptCloseTimerRef.current = null;
    }, ATTACHMENT_LINK_PROMPT_CLOSE_DELAY_MS);
  }, [clearAttachmentPromptCloseTimer, onDismissAttachmentPastePrompt]);

  const updateAttachmentPromptPosition = useCallback(
    (anchorElement: HTMLAnchorElement) => {
      const anchorRect = anchorElement.getBoundingClientRect();
      const minLeft =
        ATTACHMENT_LINK_PROMPT_EDGE_MARGIN +
        ATTACHMENT_LINK_PROMPT_MIN_WIDTH / 2;
      const maxLeft =
        window.innerWidth -
        ATTACHMENT_LINK_PROMPT_EDGE_MARGIN -
        ATTACHMENT_LINK_PROMPT_MIN_WIDTH / 2;
      const centeredLeft = anchorRect.left + anchorRect.width / 2;

      setAttachmentPromptPosition({
        top: Math.max(ATTACHMENT_LINK_PROMPT_EDGE_MARGIN, anchorRect.top),
        left: Math.min(maxLeft, Math.max(minLeft, centeredLeft)),
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      clearAttachmentPromptCloseTimer();
    };
  }, [clearAttachmentPromptCloseTimer]);

  useEffect(() => {
    if (linkPromptUrl) {
      return;
    }

    setAttachmentPromptPosition(null);
  }, [linkPromptUrl]);

  return {
    attachmentPromptPosition,
    clearAttachmentPromptCloseTimer,
    scheduleAttachmentPromptClose,
    updateAttachmentPromptPosition,
  };
};
