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
  itemToStringLabel = item => item.name,
  itemToStringValue = item => item.id,
  isItemEqualToValue = (item, value) =>
    itemToStringValue(item) === itemToStringValue(value),
  items,
  ...props
}: PharmaEntityComboboxSelectProps<Item>) {
  const fallbackSelectedValue =
    valueId === ''
      ? null
      : ({
          id: valueId,
          name: valueId,
        } as Item);
  const selectedItemValue =
    selectedItem && itemToStringValue(selectedItem) === valueId
      ? selectedItem
      : null;
  const value =
    findComboboxItemByValue(items, valueId, itemToStringValue) ??
    selectedItemValue ??
    fallbackSelectedValue;

  return (
    <PharmaComboboxSelect
      {...props}
      items={items}
      value={value}
      onValueChange={(item, details) => {
        onValueIdChange(item ? itemToStringValue(item) : '', item, details);
      }}
      itemToStringLabel={itemToStringLabel}
      itemToStringValue={itemToStringValue}
      isItemEqualToValue={isItemEqualToValue}
    />
  );
}
