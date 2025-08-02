import { RefObject } from 'react';

export interface UseDropdownEffectsProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  value?: string;
  setApplyOpenStyles: (value: boolean) => void;
  setHighlightedIndex: (index: number) => void;
  setExpandedId: (id: string | null) => void;
  calculateDropdownPosition: () => void;
  manageFocusOnOpen: () => void;
  handleFocusOut: () => void;
  clearTimeouts: () => void;
  resetPosition: () => void;
  resetSearch: () => void;
  checkScroll: () => void;
  scrollToHighlightedOption: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  highlightedIndex: number;
}

export interface UseFocusManagementProps {
  isOpen: boolean;
  searchList: boolean;
  touched: boolean;
  setTouched: (touched: boolean) => void;
  actualCloseDropdown: () => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export interface UseScrollManagementProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  highlightedIndex: number;
  checkScroll: () => void;
  scrollToHighlightedOption: () => void;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}
