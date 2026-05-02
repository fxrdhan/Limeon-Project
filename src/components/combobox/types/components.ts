import { RefObject } from 'react';
import type { ComboboxOption } from '@/types';

export interface ComboboxMenuProps {
  popupId: string;
  popupLabel: string;
  isFrozen?: boolean;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  render?: (
    props: React.HTMLAttributes<HTMLDivElement> & {
      ref: React.ForwardedRef<HTMLDivElement>;
    },
    state: {
      open: boolean;
      closed: boolean;
      frozen: boolean;
      side: 'top' | 'bottom';
    }
  ) => React.ReactElement;
}

export interface OptionItemProps {
  option: ComboboxOption;
  index: number;
  optionId: string;
  optionCount: number;
  isSelected: boolean;
  isHighlighted: boolean;
  suppressHighlightBackground: boolean;
  activeBackgroundLayoutId?: string;
  isExpanded: boolean;
  onHighlight: (
    index: number,
    event?: Event | React.SyntheticEvent<HTMLElement>
  ) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
  render?: (
    props: React.HTMLAttributes<HTMLDivElement>,
    state: {
      selected: boolean;
      highlighted: boolean;
      disabled: boolean;
    }
  ) => React.ReactElement;
}

export interface SearchBarProps {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}
