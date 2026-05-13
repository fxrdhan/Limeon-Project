import type { PharmaComboboxSelectProps } from '../presets-types';
import { getDefaultItemDisabled } from './preset-item';

export interface PharmaComboboxControllerConfig<Item> {
  id?: string;
  label?: string;
  name?: string;
  items: Item[];
  value: Item | null;
  onValueChange: PharmaComboboxSelectProps<Item>['onValueChange'];
  itemToStringLabel: PharmaComboboxSelectProps<Item>['itemToStringLabel'];
  itemToStringValue: PharmaComboboxSelectProps<Item>['itemToStringValue'];
  isItemEqualToValue?: PharmaComboboxSelectProps<Item>['isItemEqualToValue'];
  isItemDisabledProp: NonNullable<
    PharmaComboboxSelectProps<Item>['isItemDisabled']
  >;
  isValueEmpty?: PharmaComboboxSelectProps<Item>['isValueEmpty'];
  itemToHoverDetailData?: PharmaComboboxSelectProps<Item>['itemToHoverDetailData'];
  renderOption?: PharmaComboboxSelectProps<Item>['renderOption'];
  renderOptionMeta?: PharmaComboboxSelectProps<Item>['renderOptionMeta'];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  visibleItemLimit?: number;
  searchable: boolean;
  indicator: NonNullable<PharmaComboboxSelectProps<Item>['indicator']>;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  tabIndex?: number;
  form?: string;
  className?: string;
  popupClassName?: string;
  popupContainerRef?: PharmaComboboxSelectProps<Item>['popupContainerRef'];
  popupMatchAnchorWidth: boolean;
  validation?: PharmaComboboxSelectProps<Item>['validation'];
  createAction?: PharmaComboboxSelectProps<Item>['createAction'];
  hoverDetail?: PharmaComboboxSelectProps<Item>['hoverDetail'];
  onFetchHoverDetail?: PharmaComboboxSelectProps<Item>['onFetchHoverDetail'];
  onFetchHoverDetailError?: PharmaComboboxSelectProps<Item>['onFetchHoverDetailError'];
  open?: boolean;
  onOpenChange?: PharmaComboboxSelectProps<Item>['onOpenChange'];
  ariaLabel?: PharmaComboboxSelectProps<Item>['aria-label'];
  ariaLabelledBy?: PharmaComboboxSelectProps<Item>['aria-labelledby'];
  ariaDescribedBy?: PharmaComboboxSelectProps<Item>['aria-describedby'];
}

export function getPharmaComboboxControllerConfig<Item>({
  id,
  label,
  name,
  items,
  value,
  onValueChange,
  itemToStringLabel,
  itemToStringValue,
  isItemEqualToValue,
  isItemDisabled: isItemDisabledProp = getDefaultItemDisabled,
  isValueEmpty,
  itemToHoverDetailData,
  renderOption,
  renderOptionMeta,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data',
  visibleItemLimit,
  searchable = true,
  indicator = 'none',
  required = false,
  disabled = false,
  readOnly = false,
  tabIndex,
  form,
  className,
  popupClassName,
  popupContainerRef,
  popupMatchAnchorWidth = true,
  validation,
  createAction,
  hoverDetail,
  onFetchHoverDetail,
  onFetchHoverDetailError,
  open,
  onOpenChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: PharmaComboboxSelectProps<Item>): PharmaComboboxControllerConfig<Item> {
  return {
    id,
    label,
    name,
    items,
    value,
    onValueChange,
    itemToStringLabel,
    itemToStringValue,
    isItemEqualToValue,
    isItemDisabledProp,
    isValueEmpty,
    itemToHoverDetailData,
    renderOption,
    renderOptionMeta,
    placeholder,
    searchPlaceholder,
    emptyText,
    visibleItemLimit,
    searchable,
    indicator,
    required,
    disabled,
    readOnly,
    tabIndex,
    form,
    className,
    popupClassName,
    popupContainerRef,
    popupMatchAnchorWidth,
    validation,
    createAction,
    hoverDetail,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    open,
    onOpenChange,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
  };
}
