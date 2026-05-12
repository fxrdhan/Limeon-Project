import { useEffect, useRef } from 'react';

export function usePharmaComboboxOpenLifecycle({
  actualOpen,
  clearFocusRestoreIntent,
  resetOnClose,
  resetOnOpen,
  restoreFocusAfterCloseIfNeeded,
}: {
  actualOpen: boolean;
  clearFocusRestoreIntent: () => void;
  resetOnClose: () => void;
  resetOnOpen: () => void;
  restoreFocusAfterCloseIfNeeded: () => void;
}) {
  const previousActualOpenRef = useRef(actualOpen);

  useEffect(() => {
    const wasOpen = previousActualOpenRef.current;
    previousActualOpenRef.current = actualOpen;

    if (actualOpen) {
      if (!wasOpen) {
        clearFocusRestoreIntent();
        resetOnOpen();
      }
      return;
    }

    resetOnClose();
    restoreFocusAfterCloseIfNeeded();
  }, [
    actualOpen,
    clearFocusRestoreIntent,
    resetOnClose,
    resetOnOpen,
    restoreFocusAfterCloseIfNeeded,
  ]);
}
