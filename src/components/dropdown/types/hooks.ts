import { RefObject } from 'react';
import type { DropdownMode } from '@/types';

export interface UseDropdownEffectsProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  value?: string;
  setApplyOpenStyles: (value: boolean) => void;
  setExpandedId: (id: string | null) => void;
  calculateDropdownPosition: () => void;
  manageFocusOnOpen: () => void;
  handleFocusOut: () => void;
  resetPosition: () => void;
  resetSearch: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  // Hover-related props
  hoverToOpen: boolean;
  isClosing: boolean;
  openThisDropdown: () => void;
  actualCloseDropdown: () => void;
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
  mode?: DropdownMode;
}

export interface UseScrollManagementProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  autoScrollOnOpen: boolean;
}
