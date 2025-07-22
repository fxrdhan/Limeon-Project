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
}: UseFocusManagementProps) => {
  const manageFocusOnOpen = useCallback(() => {
    if (isOpen) {
      setTimeout(
        () => {
          (searchList ? searchInputRef : optionsContainerRef).current?.focus();
        },
        searchList ? DROPDOWN_CONSTANTS.SEARCH_FOCUS_DELAY : DROPDOWN_CONSTANTS.FOCUS_DELAY,
      );
    }
  }, [isOpen, searchList, searchInputRef, optionsContainerRef]);

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
  }, [isOpen, actualCloseDropdown, touched, setTouched, dropdownRef, dropdownMenuRef]);

  return {
    manageFocusOnOpen,
    handleFocusOut,
  };
};