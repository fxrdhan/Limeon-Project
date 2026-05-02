import { RefObject } from 'react';
import type { ComboboxMode, ComboboxOpenChangeDetails } from '@/types';

export interface UseComboboxEffectsProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  value?: string;
  setApplyOpenStyles: (value: boolean) => void;
  setExpandedId: (id: string | null) => void;
  calculateComboboxPosition: () => void;
  manageFocusOnOpen: () => void;
  handleFocusOut: (event?: Event) => void;
  resetPosition: () => void;
  resetSearch: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  // Hover-related props
  hoverToOpen: boolean;
  isClosing: boolean;
  openThisCombobox: (details?: ComboboxOpenChangeDetails) => boolean;
  actualCloseCombobox: (
    force?: boolean,
    details?: ComboboxOpenChangeDetails
  ) => boolean;
}

export interface UseFocusManagementProps {
  isOpen: boolean;
  searchList: boolean;
  touched: boolean;
  setTouched: (touched: boolean) => void;
  actualCloseCombobox: (reasonOrDetails?: ComboboxOpenChangeDetails) => boolean;
  shouldKeepOpen?: () => boolean;
  shouldSkipOpenFocus?: () => boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  mode?: ComboboxMode;
}

export interface UseScrollManagementProps {
  isOpen: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  searchTerm: string;
  debouncedSearchTerm: string;
  selectedValue?: string;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  autoScrollOnOpen: boolean;
}
