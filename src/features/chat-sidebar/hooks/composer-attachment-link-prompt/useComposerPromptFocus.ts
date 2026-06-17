import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

export const useComposerPromptFocus = (
  messageInputRef: RefObject<HTMLTextAreaElement | null>,
  resetKey?: string | null
) => {
  const focusFrameRef = useRef<number | null>(null);
  const focusRequestRef = useRef(0);

  const clearPendingFocusFrame = useCallback(() => {
    focusRequestRef.current += 1;

    if (focusFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = null;
  }, []);

  const focusComposerSelection = useCallback(
    (selectionStart: number, selectionEnd = selectionStart) => {
      clearPendingFocusFrame();

      const focusRequestId = focusRequestRef.current + 1;
      let didRunSynchronously = false;
      focusRequestRef.current = focusRequestId;

      const frameId = requestAnimationFrame(() => {
        didRunSynchronously = true;

        if (focusRequestRef.current !== focusRequestId) {
          return;
        }

        focusFrameRef.current = null;
        const textarea = messageInputRef.current;
        if (!textarea) {
          return;
        }

        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });

      if (didRunSynchronously) {
        return;
      }

      focusFrameRef.current = frameId;
    },
    [clearPendingFocusFrame, messageInputRef]
  );

  useEffect(() => {
    clearPendingFocusFrame();
  }, [clearPendingFocusFrame, resetKey]);

  useEffect(
    () => () => {
      clearPendingFocusFrame();
    },
    [clearPendingFocusFrame]
  );

  return focusComposerSelection;
};
