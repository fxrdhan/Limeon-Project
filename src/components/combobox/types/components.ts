import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ElementType,
  ForwardedRef,
  HTMLAttributes,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from 'react';
import type { ComboboxOption } from '@/types';

export type ComboboxRenderProp<
  Props,
  State,
  RootElement extends ElementType = ElementType,
> =
  | ReactElement<Partial<Props>, RootElement>
  | ((props: Props, state: State) => ReactElement<Partial<Props>, RootElement>);

export interface ComboboxTriggerState {
  open: boolean;
  disabled: boolean;
  invalid: boolean;
  placeholder: boolean;
}

export type ComboboxTriggerRenderProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    ref: ForwardedRef<HTMLButtonElement>;
  };

export interface ComboboxTriggerProps {
  className?: string;
  style?: CSSProperties;
  render?: ComboboxRenderProp<
    ComboboxTriggerRenderProps,
    ComboboxTriggerState,
    'button'
  >;
}

export interface ComboboxPopupState {
  open: boolean;
  closed: boolean;
  frozen: boolean;
  side: 'top' | 'bottom';
}

export type ComboboxPopupRenderProps = HTMLAttributes<HTMLDivElement> & {
  ref: ForwardedRef<HTMLDivElement>;
};

export interface ComboboxPopupProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  render?: ComboboxRenderProp<
    ComboboxPopupRenderProps,
    ComboboxPopupState,
    'div'
  >;
}

export interface ComboboxListState {
  open: boolean;
  empty: boolean;
  highlightedIndex: number;
}

export type ComboboxListRenderProps = HTMLAttributes<HTMLDivElement> & {
  ref: RefObject<HTMLDivElement>;
};

export interface ComboboxListProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  render?: ComboboxRenderProp<
    ComboboxListRenderProps,
    ComboboxListState,
    'div'
  >;
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
  render?: ComboboxRenderProp<
    HTMLAttributes<HTMLDivElement>,
    ComboboxListItemState,
    'div'
  >;
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
  render?: ComboboxRenderProp<
    ComboboxPopupRenderProps,
    ComboboxPopupState,
    'div'
  >;
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
  render?: ComboboxRenderProp<
    HTMLAttributes<HTMLDivElement>,
    ComboboxListItemState,
    'div'
  >;
}

export interface SearchBarProps {
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  className?: string;
  style?: CSSProperties;
  render?: ComboboxRenderProp<
    HTMLAttributes<HTMLDivElement>,
    ComboboxSearchState,
    'div'
  >;
}

export interface ComboboxSearchState {
  open: boolean;
  empty: boolean;
  value: string;
}

export interface ComboboxSearchProps {
  className?: string;
  style?: CSSProperties;
  render?: ComboboxRenderProp<
    HTMLAttributes<HTMLDivElement>,
    ComboboxSearchState,
    'div'
  >;
}
