import { RefObject } from 'react';
import type { ComboboxOption } from '@/types';

export interface ComboboxMenuProps {
  isFrozen?: boolean;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface OptionItemProps {
  option: ComboboxOption;
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  suppressHighlightBackground: boolean;
  activeBackgroundLayoutId?: string;
  isExpanded: boolean;
  onHighlight: (index: number) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
}

export interface SearchBarProps {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}
