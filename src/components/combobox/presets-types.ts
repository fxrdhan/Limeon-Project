import type React from 'react';
import type { HoverDetailData } from '@/types/components';
import type { ComboboxIndicatorKind } from './components/combobox-selection-indicator';
import type { ComboboxCreateAction } from './hooks/use-combobox-create-action';
import type { ComboboxRootProps } from './primitive';
import type { ComboboxValueIsEmpty } from './utils/preset-state';

export type PharmaComboboxChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onValueChange']>
>[1];

export type PharmaComboboxOpenChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onOpenChange']>
>[1];

export interface PharmaComboboxOptionRenderState {
  disabled: boolean;
  highlighted: boolean;
  inputValue: string;
  label: string;
  selected: boolean;
}

export interface PharmaComboboxSelectProps<Item> {
  id?: string;
  label?: string;
  name?: string;
  items: readonly Item[];
  value: Item | null;
  onValueChange: (
    item: Item | null,
    details: PharmaComboboxChangeDetails<Item>
  ) => void;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  isItemEqualToValue?: (item: Item, value: Item) => boolean;
  isItemDisabled?: (item: Item) => boolean;
  isValueEmpty?: ComboboxValueIsEmpty<Item>;
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  renderOption?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
  renderOptionMeta?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  visibleItemLimit?: number;
  searchable?: boolean;
  indicator?: ComboboxIndicatorKind;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  form?: string;
  className?: string;
  popupClassName?: string;
  popupContainerRef?: React.RefObject<Element | DocumentFragment | null>;
  popupMatchAnchorWidth?: boolean;
  validation?: {
    enabled?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };
  createAction?: ComboboxCreateAction;
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
  open?: boolean;
  onOpenChange?: (
    open: boolean,
    details: PharmaComboboxOpenChangeDetails<Item>
  ) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
