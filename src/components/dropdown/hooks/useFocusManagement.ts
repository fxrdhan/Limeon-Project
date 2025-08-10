import { useCallback } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';
import type { UseFocusManagementProps } from '../types';

export const useFocusManagement = ({
  isOpen,
  searchList,
  touched,
  setTouched,
  actualCloseDropdown,
  dropdownRef,
  dropdownMenuRef,
  searchInputRef,
  optionsContainerRef,
  mode,
}: UseFocusManagementProps) => {
  const manageFocusOnOpen = useCallback(() => {
    if (isOpen) {
      setTimeout(
        () => {
          if (searchList) {
            searchInputRef.current?.focus();
          } else {
            // For text mode without search, don't auto-focus to avoid scroll conflicts
            // Let keyboard navigation be handled by button focus instead
            if (mode === 'input') {
              optionsContainerRef.current?.focus();
            }
            // For text mode, keep focus on button to avoid container focus conflicts
          }
        },
        searchList
          ? DROPDOWN_CONSTANTS.SEARCH_FOCUS_DELAY
          : DROPDOWN_CONSTANTS.FOCUS_DELAY
      );
    }
  }, [isOpen, searchList, searchInputRef, optionsContainerRef, mode]);

  const handleFocusOut = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isFocusInDropdown =
        dropdownRef.current?.contains(activeElement) ||
        dropdownMenuRef.current?.contains(activeElement);

      if (!isFocusInDropdown) {
        if (isOpen) {
          actualCloseDropdown();
        }
        if (!touched) {
          setTouched(true);
        }
      }
    }, 0);
  }, [
    isOpen,
    actualCloseDropdown,
    touched,
    setTouched,
    dropdownRef,
    dropdownMenuRef,
  ]);

  return {
    manageFocusOnOpen,
    handleFocusOut,
  };
};
