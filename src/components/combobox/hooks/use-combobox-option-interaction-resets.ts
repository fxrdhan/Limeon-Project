import { useCallback, type Dispatch, type SetStateAction } from 'react';

export function useComboboxOptionInteractionResets({
  cancelPendingHoverDetail,
  clearKeyboardHoverDetailSync,
  hideHoverDetail,
  resetKeyboardHoverSuppression,
  resetPointerHoverState,
  resetScrollHoverDetailState,
  setInputValue,
  setIsSearchNavigationFocus,
}: {
  cancelPendingHoverDetail: () => void;
  clearKeyboardHoverDetailSync: () => void;
  hideHoverDetail: () => void;
  resetKeyboardHoverSuppression: () => void;
  resetPointerHoverState: () => void;
  resetScrollHoverDetailState: () => void;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
}) {
  const resetAfterValueChange = useCallback(() => {
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    setInputValue('');
    setIsSearchNavigationFocus(false);
    resetKeyboardHoverSuppression();
    hideHoverDetail();
  }, [
    clearKeyboardHoverDetailSync,
    hideHoverDetail,
    resetKeyboardHoverSuppression,
    resetScrollHoverDetailState,
    setInputValue,
    setIsSearchNavigationFocus,
  ]);

  const resetOnOpen = useCallback(() => {
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    cancelPendingHoverDetail();
  }, [
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    resetScrollHoverDetailState,
  ]);

  const resetOnClose = useCallback(() => {
    setIsSearchNavigationFocus(false);
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    hideHoverDetail();
    resetPointerHoverState();
  }, [
    clearKeyboardHoverDetailSync,
    hideHoverDetail,
    resetPointerHoverState,
    resetScrollHoverDetailState,
    setIsSearchNavigationFocus,
  ]);

  return {
    resetAfterValueChange,
    resetOnClose,
    resetOnOpen,
  };
}
