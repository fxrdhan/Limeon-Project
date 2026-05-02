import { useCallback, useEffect, useRef } from 'react';
import { COMBOBOX_CONSTANTS } from '../constants';
import { createComboboxChangeDetails } from '../utils/eventDetails';
import type { UseFocusManagementProps } from '../types';

export const useFocusManagement = ({
  isOpen,
  searchList,
  touched,
  setTouched,
  actualCloseCombobox,
  shouldKeepOpen,
  shouldSkipOpenFocus,
  dropdownRef,
  dropdownMenuRef,
  optionsContainerRef,
  mode,
}: UseFocusManagementProps) => {
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingFocus = useCallback(() => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  const manageFocusOnOpen = useCallback(() => {
    if (isOpen) {
      if (shouldSkipOpenFocus?.()) {
        return;
      }
      if (searchList) {
        return;
      }
      clearPendingFocus();
      focusTimeoutRef.current = setTimeout(() => {
        focusTimeoutRef.current = null;

        const activeElement = document.activeElement;
        const dropdownOwnerDialog =
          dropdownRef.current?.closest('[role="dialog"][aria-modal="true"]') ??
          null;
        const activeDialog =
          activeElement instanceof Element
            ? activeElement.closest('[role="dialog"][aria-modal="true"]')
            : null;

        if (activeDialog && activeDialog !== dropdownOwnerDialog) {
          return;
        }

        if (mode === 'input') {
          // For text mode without search, don't auto-focus to avoid scroll conflicts.
          optionsContainerRef.current?.focus();
        }
      }, COMBOBOX_CONSTANTS.FOCUS_DELAY);
    }
  }, [
    clearPendingFocus,
    dropdownRef,
    isOpen,
    mode,
    optionsContainerRef,
    searchList,
    shouldSkipOpenFocus,
  ]);

  const handleFocusOut = useCallback(
    (event?: Event) => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        const isFocusInCombobox =
          dropdownRef.current?.contains(activeElement) ||
          dropdownMenuRef.current?.contains(activeElement);

        if (shouldKeepOpen?.()) {
          if (!touched) {
            setTouched(true);
          }
          return;
        }

        if (!isFocusInCombobox) {
          if (isOpen) {
            actualCloseCombobox(
              createComboboxChangeDetails('focus-out' as const, event)
            );
          }
          if (!touched) {
            setTouched(true);
          }
        }
      }, 0);
    },
    [
      isOpen,
      actualCloseCombobox,
      shouldKeepOpen,
      touched,
      setTouched,
      dropdownRef,
      dropdownMenuRef,
    ]
  );

  useEffect(() => clearPendingFocus, [clearPendingFocus]);

  return {
    clearPendingFocus,
    manageFocusOnOpen,
    handleFocusOut,
  };
};
