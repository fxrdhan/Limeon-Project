import { useCallback, useMemo } from 'react';
import { findComboboxItemByValue } from './helpers';
import {
  PharmaComboboxSelect,
  type PharmaComboboxChangeDetails,
  type PharmaComboboxSelectProps,
} from './presets';

type EntityComboboxItem = {
  id: string;
  name: string;
};

const getDefaultEntityItemLabel = (item: EntityComboboxItem) => item.name;
const getDefaultEntityItemValue = (item: EntityComboboxItem) => item.id;
const unavailableEntityItemLabel = 'Pilihan tersimpan';
const unavailableEntityValueMarker: unique symbol = Symbol(
  'unavailableEntityValue'
);

type UnavailableEntityValue = {
  readonly [unavailableEntityValueMarker]: true;
  readonly id: string;
  readonly name: string;
};

type EntityComboboxValue<Item extends EntityComboboxItem> =
  | Item
  | UnavailableEntityValue;

const isUnavailableEntityValue = <Item extends EntityComboboxItem>(
  item: EntityComboboxValue<Item> | null
): item is UnavailableEntityValue =>
  Boolean(
    item && typeof item === 'object' && unavailableEntityValueMarker in item
  );

export interface PharmaEntityComboboxSelectProps<
  Item extends EntityComboboxItem,
> extends Omit<
  PharmaComboboxSelectProps<Item>,
  | 'value'
  | 'onValueChange'
  | 'itemToStringLabel'
  | 'itemToStringValue'
  | 'isItemEqualToValue'
> {
  valueId: string;
  selectedItem?: Item | null;
  onValueIdChange: (
    valueId: string,
    item: Item | null,
    details: PharmaComboboxChangeDetails<Item>
  ) => void;
  itemToStringLabel?: (item: Item) => string;
  itemToStringValue?: (item: Item) => string;
  isItemEqualToValue?: (item: Item, value: Item) => boolean;
}

export function PharmaEntityComboboxSelect<Item extends EntityComboboxItem>({
  valueId,
  selectedItem = null,
  onValueIdChange,
  itemToStringLabel,
  itemToStringValue,
  isItemEqualToValue,
  isItemDisabled,
  isValueEmpty,
  itemToHoverDetailData,
  renderOption,
  renderOptionMeta,
  items,
  ...props
}: PharmaEntityComboboxSelectProps<Item>) {
  const itemLabelFormatter = itemToStringLabel ?? getDefaultEntityItemLabel;
  const itemValueFormatter = itemToStringValue ?? getDefaultEntityItemValue;
  const fallbackSelectedValue = useMemo(
    () =>
      valueId === ''
        ? null
        : ({
            [unavailableEntityValueMarker]: true,
            id: valueId,
            name: valueId,
          } satisfies UnavailableEntityValue),
    [valueId]
  );
  const selectedItemValue = useMemo(
    () =>
      selectedItem && itemValueFormatter(selectedItem) === valueId
        ? selectedItem
        : null,
    [itemValueFormatter, selectedItem, valueId]
  );
  const value = useMemo(
    () =>
      findComboboxItemByValue(items, valueId, itemValueFormatter) ??
      selectedItemValue ??
      fallbackSelectedValue,
    [
      fallbackSelectedValue,
      itemValueFormatter,
      items,
      selectedItemValue,
      valueId,
    ]
  );
  const getItemLabel = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item)
        ? unavailableEntityItemLabel
        : itemLabelFormatter(item),
    [itemLabelFormatter]
  );
  const getItemValue = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item) ? item.id : itemValueFormatter(item),
    [itemValueFormatter]
  );
  const getIsItemEqualToValue = useCallback(
    (item: EntityComboboxValue<Item>, nextValue: EntityComboboxValue<Item>) => {
      if (isUnavailableEntityValue(item)) {
        if (isUnavailableEntityValue(nextValue)) {
          return item.id === nextValue.id;
        }

        return itemValueFormatter(nextValue) === item.id;
      }

      if (isUnavailableEntityValue(nextValue)) {
        return itemValueFormatter(item) === nextValue.id;
      }

      return isItemEqualToValue
        ? isItemEqualToValue(item, nextValue)
        : itemValueFormatter(item) === itemValueFormatter(nextValue);
    },
    [isItemEqualToValue, itemValueFormatter]
  );
  const getIsItemDisabled = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item) ? false : Boolean(isItemDisabled?.(item)),
    [isItemDisabled]
  );
  const getIsValueEmpty = useCallback(
    (item: EntityComboboxValue<Item> | null) =>
      isUnavailableEntityValue(item) ? false : Boolean(isValueEmpty?.(item)),
    [isValueEmpty]
  );
  const getItemHoverDetailData = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item)
        ? {}
        : (itemToHoverDetailData?.(item) ?? {}),
    [itemToHoverDetailData]
  );
  const renderEntityOption = useCallback(
    (
      item: EntityComboboxValue<Item>,
      state: Parameters<
        NonNullable<PharmaComboboxSelectProps<Item>['renderOption']>
      >[1]
    ) =>
      isUnavailableEntityValue(item)
        ? unavailableEntityItemLabel
        : renderOption?.(item, state),
    [renderOption]
  );
  const renderEntityOptionMeta = useCallback(
    (
      item: EntityComboboxValue<Item>,
      state: Parameters<
        NonNullable<PharmaComboboxSelectProps<Item>['renderOptionMeta']>
      >[1]
    ) =>
      isUnavailableEntityValue(item) ? null : renderOptionMeta?.(item, state),
    [renderOptionMeta]
  );
  const handleValueChange = useCallback(
    (
      item: EntityComboboxValue<Item> | null,
      details: PharmaComboboxChangeDetails<EntityComboboxValue<Item>>
    ) => {
      onValueIdChange(
        item ? getItemValue(item) : '',
        item && !isUnavailableEntityValue(item) ? item : null,
        details
      );
    },
    [getItemValue, onValueIdChange]
  );

  return (
    <PharmaComboboxSelect<EntityComboboxValue<Item>>
      {...props}
      items={items}
      value={value}
      onValueChange={handleValueChange}
      itemToStringLabel={getItemLabel}
      itemToStringValue={getItemValue}
      isItemEqualToValue={getIsItemEqualToValue}
      isItemDisabled={isItemDisabled ? getIsItemDisabled : undefined}
      isValueEmpty={isValueEmpty ? getIsValueEmpty : undefined}
      itemToHoverDetailData={
        itemToHoverDetailData ? getItemHoverDetailData : undefined
      }
      renderOption={renderOption ? renderEntityOption : undefined}
      renderOptionMeta={renderOptionMeta ? renderEntityOptionMeta : undefined}
    />
  );
}
