import { useCallback, useRef, type MutableRefObject } from 'react';

export type ComboboxKeyboardHoverDetailTimerRef = MutableRefObject<ReturnType<
  typeof setTimeout
> | null>;

export function useComboboxKeyboardHoverDetailTimer() {
  const keyboardHoverDetailSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const clearKeyboardHoverDetailSync = useCallback(() => {
    if (keyboardHoverDetailSyncTimeoutRef.current === null) return;

    clearTimeout(keyboardHoverDetailSyncTimeoutRef.current);
    keyboardHoverDetailSyncTimeoutRef.current = null;
  }, []);

  return {
    clearKeyboardHoverDetailSync,
    keyboardHoverDetailSyncTimeoutRef,
  };
}
