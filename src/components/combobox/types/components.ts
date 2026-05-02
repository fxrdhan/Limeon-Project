import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ForwardedRef,
  HTMLAttributes,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from 'react';
import type { ComboboxOption } from '@/types';

export interface ComboboxTriggerState {
  open: boolean;
  disabled: boolean;
  invalid: boolean;
  placeholder: boolean;
}

export interface ComboboxTriggerProps {
  className?: string;
  style?: CSSProperties;
  render?: (
    props: ButtonHTMLAttributes<HTMLButtonElement> & {
      ref: ForwardedRef<HTMLButtonElement>;
    },
    state: ComboboxTriggerState
  ) => ReactElement;
}

export interface ComboboxPopupState {
  open: boolean;
  closed: boolean;
  frozen: boolean;
  side: 'top' | 'bottom';
}

export interface ComboboxPopupProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement> & {
      ref: ForwardedRef<HTMLDivElement>;
    },
    state: ComboboxPopupState
  ) => ReactElement;
}

export interface ComboboxListState {
  open: boolean;
  empty: boolean;
  highlightedIndex: number;
}

export interface ComboboxListProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement> & {
      ref: RefObject<HTMLDivElement>;
    },
    state: ComboboxListState
  ) => ReactElement;
}

export interface ComboboxListItemState {
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
}

export interface ComboboxListItemProps {
  option: ComboboxOption;
  index?: number;
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement>,
    state: ComboboxListItemState
  ) => ReactElement;
}

export interface ComboboxMenuProps {
  popupId: string;
  popupLabel: string;
  children?: ReactNode;
  isFrozen?: boolean;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  onSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement> & {
      ref: ForwardedRef<HTMLDivElement>;
    },
    state: ComboboxPopupState
  ) => ReactElement;
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
    event?: Event | SyntheticEvent<HTMLElement>
  ) => void;
  dropdownMenuRef: RefObject<HTMLDivElement | null>;
  className?: string;
  style?: CSSProperties;
  render?: (
    props: HTMLAttributes<HTMLDivElement>,
    state: ComboboxListItemState
  ) => ReactElement;
}

export interface SearchBarProps {
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
}
