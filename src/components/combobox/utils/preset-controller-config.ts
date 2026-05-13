import type { PharmaComboboxSelectProps } from '../presets-types';
import { getDefaultItemDisabled } from './preset-item';

export interface PharmaComboboxControllerConfig<Item> {
  id?: string;
  label?: string;
  name?: string;
  items: readonly Item[];
  value: Item | null;
  onValueChange: PharmaComboboxSelectProps<Item>['onValueChange'];
  itemToStringLabel: PharmaComboboxSelectProps<Item>['item']['toLabel'];
  itemToStringValue: PharmaComboboxSelectProps<Item>['item']['toValue'];
  isItemEqualToValue?: PharmaComboboxSelectProps<Item>['item']['isEqualToValue'];
  isItemDisabledProp: NonNullable<
    PharmaComboboxSelectProps<Item>['item']['isDisabled']
  >;
  isValueEmpty?: PharmaComboboxSelectProps<Item>['item']['isValueEmpty'];
  itemToHoverDetailData?: PharmaComboboxSelectProps<Item>['item']['toHoverDetailData'];
  renderOption?: NonNullable<
    PharmaComboboxSelectProps<Item>['display']
  >['renderOption'];
  renderOptionMeta?: NonNullable<
    PharmaComboboxSelectProps<Item>['display']
  >['renderOptionMeta'];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  visibleItemLimit?: number;
  searchable: boolean;
  indicator: NonNullable<
    NonNullable<PharmaComboboxSelectProps<Item>['display']>['indicator']
  >;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  tabIndex?: number;
  form?: string;
  className?: string;
  popupClassName?: string;
  popupContainerRef?: NonNullable<
    PharmaComboboxSelectProps<Item>['popup']
  >['containerRef'];
  popupMatchAnchorWidth: boolean;
  validation?: PharmaComboboxSelectProps<Item>['validation'];
  createAction?: PharmaComboboxSelectProps<Item>['creation'];
  hoverDetail?: PharmaComboboxSelectProps<Item>['hoverDetail'];
  onFetchHoverDetail?: NonNullable<
    PharmaComboboxSelectProps<Item>['hoverDetail']
  >['fetch'];
  onFetchHoverDetailError?: NonNullable<
    PharmaComboboxSelectProps<Item>['hoverDetail']
  >['onFetchError'];
  open?: boolean;
  onOpenChange?: NonNullable<
    PharmaComboboxSelectProps<Item>['interaction']
  >['onOpenChange'];
  ariaLabel?: NonNullable<
    NonNullable<PharmaComboboxSelectProps<Item>['field']>['aria']
  >['label'];
  ariaLabelledBy?: NonNullable<
    NonNullable<PharmaComboboxSelectProps<Item>['field']>['aria']
  >['labelledBy'];
  ariaDescribedBy?: NonNullable<
    NonNullable<PharmaComboboxSelectProps<Item>['field']>['aria']
  >['describedBy'];
}

export function getPharmaComboboxControllerConfig<Item>({
  items,
  value,
  onValueChange,
  item,
  field,
  interaction,
  display,
  search,
  popup,
  validation,
  creation,
  hoverDetail,
}: PharmaComboboxSelectProps<Item>): PharmaComboboxControllerConfig<Item> {
  return {
    id: field?.id,
    label: field?.label,
    name: field?.name,
    items,
    value,
    onValueChange,
    itemToStringLabel: item.toLabel,
    itemToStringValue: item.toValue,
    isItemEqualToValue: item.isEqualToValue,
    isItemDisabledProp: item.isDisabled ?? getDefaultItemDisabled,
    isValueEmpty: item.isValueEmpty,
    itemToHoverDetailData: item.toHoverDetailData,
    renderOption: display?.renderOption,
    renderOptionMeta: display?.renderOptionMeta,
    placeholder: display?.placeholder ?? '-- Pilih --',
    searchPlaceholder: search?.placeholder ?? 'Cari...',
    emptyText: display?.emptyText ?? 'Tidak ada data',
    visibleItemLimit: search?.visibleItemLimit,
    searchable: search?.enabled ?? true,
    indicator: display?.indicator ?? 'none',
    required: field?.required ?? false,
    disabled: interaction?.disabled ?? false,
    readOnly: interaction?.readOnly ?? false,
    tabIndex: interaction?.tabIndex,
    form: field?.form,
    className: display?.rootClassName,
    popupClassName: popup?.className,
    popupContainerRef: popup?.containerRef,
    popupMatchAnchorWidth: popup?.matchAnchorWidth ?? true,
    validation,
    createAction: creation,
    hoverDetail,
    onFetchHoverDetail: hoverDetail?.fetch,
    onFetchHoverDetailError: hoverDetail?.onFetchError,
    open: interaction?.open,
    onOpenChange: interaction?.onOpenChange,
    ariaLabel: field?.aria?.label,
    ariaLabelledBy: field?.aria?.labelledBy,
    ariaDescribedBy: field?.aria?.describedBy,
  };
}
