import type React from 'react';
import type { HoverDetailData } from '@/types/components';
import type { ComboboxIndicatorKind } from './components/combobox-selection-indicator';
import type { ComboboxCreateAction } from './hooks/use-combobox-create-action';
import type { ComboboxRootProps } from './internal/primitive';
import type { ComboboxValueIsEmpty } from './utils/preset-value';

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

export interface PharmaComboboxItemConfig<Item> {
  toLabel: (item: Item) => string;
  toValue: (item: Item) => string;
  isEqualToValue?: (item: Item, value: Item) => boolean;
  isDisabled?: (item: Item) => boolean;
  isValueEmpty?: ComboboxValueIsEmpty<Item>;
  toHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
}

export interface PharmaComboboxFieldConfig {
  id?: string;
  label?: string;
  name?: string;
  form?: string;
  required?: boolean;
  aria?: {
    label?: string;
    labelledBy?: string;
    describedBy?: string;
  };
}

export interface PharmaComboboxInteractionConfig<Item> {
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  open?: boolean;
  onOpenChange?: (
    open: boolean,
    details: PharmaComboboxOpenChangeDetails<Item>
  ) => void;
}

export interface PharmaComboboxDisplayConfig<Item> {
  rootClassName?: string;
  placeholder?: string;
  emptyText?: string;
  indicator?: ComboboxIndicatorKind;
  renderOption?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
  renderOptionMeta?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
}

export interface PharmaComboboxSearchConfig {
  enabled?: boolean;
  placeholder?: string;
  visibleItemLimit?: number;
}

export interface PharmaComboboxPopupConfig {
  className?: string;
  containerRef?: React.RefObject<Element | DocumentFragment | null>;
  matchAnchorWidth?: boolean;
}

export interface PharmaComboboxValidationConfig {
  enabled?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export interface PharmaComboboxHoverDetailConfig {
  enabled?: boolean;
  delay?: number;
  fetch?: (id: string) => Promise<HoverDetailData | null>;
  onFetchError?: (error: unknown, id: string) => void;
}

export interface PharmaComboboxClassNames {
  root?: string;
  trigger?: string;
  triggerInvalid?: string;
  triggerOpen?: string;
  triggerValue?: string;
  triggerPlaceholder?: string;
  triggerIcon?: string;
  triggerIconOpen?: string;
  positioner?: string;
  popup?: string;
  popupContent?: string;
  pinnedHighlight?: string;
  searchHeader?: string;
  searchIcon?: string;
  searchInput?: string;
  searchInputNavigationFocus?: string;
  list?: string;
  option?: string;
  optionSelected?: string;
  optionDisabled?: string;
  optionContent?: string;
  optionLabel?: string;
  optionMeta?: string;
  optionHighlight?: string;
  indicator?: string;
  indicatorSelected?: string;
  indicatorUnselected?: string;
  empty?: string;
  createAction?: string;
  createActionIcon?: string;
  createActionLabel?: string;
  validationOverlay?: string;
  validationContainer?: string;
  validationIcon?: string;
  validationMessage?: string;
  validationArrow?: string;
  hoverDetail?: string;
  hoverDetailContent?: string;
}

export interface PharmaComboboxSelectProps<Item> {
  items: readonly Item[];
  value: Item | null;
  onValueChange: (
    item: Item | null,
    details: PharmaComboboxChangeDetails<Item>
  ) => void;
  item: PharmaComboboxItemConfig<Item>;
  field?: PharmaComboboxFieldConfig;
  interaction?: PharmaComboboxInteractionConfig<Item>;
  display?: PharmaComboboxDisplayConfig<Item>;
  search?: PharmaComboboxSearchConfig;
  popup?: PharmaComboboxPopupConfig;
  validation?: PharmaComboboxValidationConfig;
  creation?: ComboboxCreateAction;
  hoverDetail?: PharmaComboboxHoverDetailConfig;
  classNames?: PharmaComboboxClassNames;
}
