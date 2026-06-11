import type { RefObject } from 'react';
import { useCallback } from 'react';

export const useComposerPromptFocus = (
  messageInputRef: RefObject<HTMLTextAreaElement | null>
) =>
  useCallback(
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
