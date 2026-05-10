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
  isValueEmpty,
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
            id: valueId,
            name: valueId,
          } as Item),
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
    (item: Item) =>
      item === fallbackSelectedValue
        ? unavailableEntityItemLabel
        : itemLabelFormatter(item),
    [fallbackSelectedValue, itemLabelFormatter]
  );
  const getItemValue = useCallback(
    (item: Item) =>
      item === fallbackSelectedValue ? valueId : itemValueFormatter(item),
    [fallbackSelectedValue, itemValueFormatter, valueId]
  );
  const getIsItemEqualToValue = useCallback(
    (item: Item, nextValue: Item) => {
      if (item === fallbackSelectedValue) {
        return itemValueFormatter(nextValue) === valueId;
      }

      if (nextValue === fallbackSelectedValue) {
        return itemValueFormatter(item) === valueId;
      }

      return isItemEqualToValue
        ? isItemEqualToValue(item, nextValue)
        : itemValueFormatter(item) === itemValueFormatter(nextValue);
    },
    [fallbackSelectedValue, isItemEqualToValue, itemValueFormatter, valueId]
  );
  const getIsValueEmpty = useCallback(
    (item: Item | null) =>
      item === fallbackSelectedValue ? false : Boolean(isValueEmpty?.(item)),
    [fallbackSelectedValue, isValueEmpty]
  );
  const handleValueChange = useCallback(
    (item: Item | null, details: PharmaComboboxChangeDetails<Item>) => {
      onValueIdChange(item ? getItemValue(item) : '', item, details);
    },
    [getItemValue, onValueIdChange]
  );

  return (
    <PharmaComboboxSelect
      {...props}
      items={items}
      value={value}
      onValueChange={handleValueChange}
      itemToStringLabel={getItemLabel}
      itemToStringValue={getItemValue}
      isItemEqualToValue={getIsItemEqualToValue}
      isValueEmpty={isValueEmpty ? getIsValueEmpty : undefined}
    />
  );
}
