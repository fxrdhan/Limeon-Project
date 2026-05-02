import { RefObject } from 'react';
import { DropDirection } from '../constants';
import type { ComboboxMode, ComboboxOption, HoverDetailData } from '@/types';

interface HoverDetailPosition {
  top: number;
  left: number;
  direction: 'right' | 'left';
  anchorCenterY: number;
}

export interface ComboboxContextType {
  // State
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  value?: string | string[];
  mode: ComboboxMode;
  selectedOption?: ComboboxOption | null;
  placeholder: string;
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
  buttonId: string;
  popupId: string;
  listboxId: string;
  searchInputId: string;
  getOptionId: (optionId: string) => string;

  // Refs
  buttonRef: RefObject<HTMLButtonElement>;
  dropdownMenuRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  optionsContainerRef: RefObject<HTMLDivElement>;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;

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
  onTriggerClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onTriggerKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onTriggerBlur: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  tabIndex?: number;
  name?: string;
  popupLabel: string;
  isPortalFrozen: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  // Hover detail handlers
  onHoverDetailShow?: (
    optionId: string,
    element: HTMLElement,
    optionData?: Partial<ComboboxOption>,
    options?: { immediate?: boolean }
  ) => Promise<void>;
  onHoverDetailHide?: () => void;
  onHoverDetailSuppress?: () => boolean;
  hoverDetail: {
    enabled: boolean;
    isVisible: boolean;
    position: HoverDetailPosition;
    data: HoverDetailData | null;
  };
}
