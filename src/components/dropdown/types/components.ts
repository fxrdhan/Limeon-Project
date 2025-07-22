import { RefObject } from 'react';

export interface DropdownMenuProps {
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface OptionItemProps {
  option: { id: string; name: string };
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isExpanded: boolean;
  onHighlight: (index: number) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
}

export interface SearchBarProps {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}