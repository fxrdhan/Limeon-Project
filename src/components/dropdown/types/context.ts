import { RefObject } from 'react';
import { DropDirection } from '../constants';

export interface DropdownContextType {
  // State
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  value?: string;
  withRadio?: boolean;
  searchList: boolean;

  // Search state
  searchTerm: string;
  searchState: string;
  filteredOptions: Array<{ id: string; name: string }>;

  // Navigation state
  highlightedIndex: number;
  isKeyboardNavigation: boolean;
  expandedId: string | null;

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
  onExpansion: (
    optionId: string,
    optionName: string,
    shouldExpand: boolean
  ) => void;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  onScroll: () => void;
}
