import { RefObject } from 'react';
import { DropDirection } from '../constants';
import type { ComboboxOption } from '@/types';

export interface ComboboxContextType {
  // State
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  value?: string | string[];
  withRadio?: boolean;
  withCheckbox?: boolean;
  searchList: boolean;
  required: boolean;
  disabled: boolean;

  // Search state
  searchTerm: string;
  searchState: string;
  filteredOptions: ComboboxOption[];

  // Navigation state
  highlightedIndex: number;
  isKeyboardNavigation: boolean;
  pendingHighlightedIndex: number | null;
  pendingHighlightSourceIndex: number | null;
  expandedId: string | null;
  activeDescendantId?: string;

  // Validation state
  hasError: boolean;

  // Scroll state
  scrollState: {
    isScrollable: boolean;
    reachedBottom: boolean;
    scrolledFromTop: boolean;
  };

  // Position state
  dropDirection: DropDirection;
  portalStyle: React.CSSProperties;
  isPositionReady: boolean;
  popupId: string;
  listboxId: string;
  searchInputId: string;
  getOptionId: (optionId: string) => string;

  // Refs
  buttonRef: RefObject<HTMLButtonElement>;
  dropdownMenuRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  optionsContainerRef: RefObject<HTMLDivElement>;

  // Handlers
  onSelect: (optionId: string) => void;
  onAddNew?: (term: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onSetHighlightedIndex: (index: number) => void;
  onSetIsKeyboardNavigation: (isKeyboard: boolean) => void;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  onScroll: () => void;
  // Hover detail handlers
  onHoverDetailShow?: (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<ComboboxOption>,
    options?: { immediate?: boolean }
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
  onHoverDetailSuppress?: () => boolean;
}
