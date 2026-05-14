import { useCallback, useMemo } from 'react';
import { findComboboxItemByValue } from './helpers';
import {
  PharmaComboboxSelect,
  type PharmaComboboxChangeDetails,
  type PharmaComboboxItemConfig,
  type PharmaComboboxOptionRenderState,
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

const getAvailableEntityItem = <Item extends EntityComboboxItem>(
  item: EntityComboboxValue<Item> | null
): Item | null =>
  item === null || isUnavailableEntityValue(item) ? null : item;

export interface PharmaEntityComboboxSelectProps<
  Item extends EntityComboboxItem,
> extends Omit<
  PharmaComboboxSelectProps<Item>,
  'value' | 'onValueChange' | 'item'
> {
  valueId: string;
  selectedItem?: Item | null;
  onValueIdChange: (
    valueId: string,
    item: Item | null,
    details: PharmaComboboxChangeDetails<Item>
  ) => void;
  item?: {
    toLabel?: PharmaComboboxItemConfig<Item>['toLabel'];
    toValue?: PharmaComboboxItemConfig<Item>['toValue'];
    isEqualToValue?: PharmaComboboxItemConfig<Item>['isEqualToValue'];
    isDisabled?: PharmaComboboxItemConfig<Item>['isDisabled'];
    isValueEmpty?: PharmaComboboxItemConfig<Item>['isValueEmpty'];
    toHoverDetailData?: PharmaComboboxItemConfig<Item>['toHoverDetailData'];
  };
}

export function PharmaEntityComboboxSelect<Item extends EntityComboboxItem>({
  valueId,
  selectedItem = null,
  onValueIdChange,
  item: itemConfig,
  display,
  items,
  ...props
}: PharmaEntityComboboxSelectProps<Item>) {
  const itemLabelFormatter = itemConfig?.toLabel ?? getDefaultEntityItemLabel;
  const itemValueFormatter = itemConfig?.toValue ?? getDefaultEntityItemValue;
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
    (item: EntityComboboxValue<Item>) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? itemLabelFormatter(availableItem)
        : unavailableEntityItemLabel;
    },
    [itemLabelFormatter]
  );
  const getItemValue = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item) ? item.id : itemValueFormatter(item),
    [itemValueFormatter]
  );
  const isItemEqualToValue = itemConfig?.isEqualToValue;
  const getIsItemEqualToValue = useCallback(
    (item: EntityComboboxValue<Item>, nextValue: EntityComboboxValue<Item>) => {
      const availableItem = getAvailableEntityItem(item);
      const availableNextValue = getAvailableEntityItem(nextValue);

      if (!availableItem) {
        if (!availableNextValue) {
          return item.id === nextValue.id;
        }

        return itemValueFormatter(availableNextValue) === item.id;
      }

      if (!availableNextValue) {
        return itemValueFormatter(availableItem) === nextValue.id;
      }

      return isItemEqualToValue
        ? isItemEqualToValue(availableItem, availableNextValue)
        : itemValueFormatter(availableItem) ===
            itemValueFormatter(availableNextValue);
    },
    [isItemEqualToValue, itemValueFormatter]
  );
  const getIsItemDisabled = useCallback(
    (item: EntityComboboxValue<Item>) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? Boolean(itemConfig?.isDisabled?.(availableItem))
        : false;
    },
    [itemConfig]
  );
  const getIsValueEmpty = useCallback(
    (item: EntityComboboxValue<Item> | null) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? Boolean(itemConfig?.isValueEmpty?.(availableItem))
        : false;
    },
    [itemConfig]
  );
  const getItemHoverDetailData = useCallback(
    (item: EntityComboboxValue<Item>) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? (itemConfig?.toHoverDetailData?.(availableItem) ?? {})
        : {};
    },
    [itemConfig]
  );
  const renderEntityOption = useCallback(
    (
      item: EntityComboboxValue<Item>,
      state: PharmaComboboxOptionRenderState
    ) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? display?.renderOption?.(availableItem, state)
        : unavailableEntityItemLabel;
    },
    [display]
  );
  const renderEntityOptionMeta = useCallback(
    (
      item: EntityComboboxValue<Item>,
      state: PharmaComboboxOptionRenderState
    ) => {
      const availableItem = getAvailableEntityItem(item);

      return availableItem
        ? display?.renderOptionMeta?.(availableItem, state)
        : null;
    },
    [display]
  );
  const handleValueChange = useCallback(
    (
      item: EntityComboboxValue<Item> | null,
      details: PharmaComboboxChangeDetails<EntityComboboxValue<Item>>
    ) => {
      const availableItem = getAvailableEntityItem(item);

      onValueIdChange(item ? getItemValue(item) : '', availableItem, details);
    },
    [getItemValue, onValueIdChange]
  );

  return (
    <PharmaComboboxSelect<EntityComboboxValue<Item>>
      {...props}
      items={items}
      value={value}
      onValueChange={handleValueChange}
      item={{
        toLabel: getItemLabel,
        toValue: getItemValue,
        isEqualToValue: getIsItemEqualToValue,
        isDisabled: itemConfig?.isDisabled ? getIsItemDisabled : undefined,
        isValueEmpty: itemConfig?.isValueEmpty ? getIsValueEmpty : undefined,
        toHoverDetailData: itemConfig?.toHoverDetailData
          ? getItemHoverDetailData
          : undefined,
      }}
      display={{
        ...display,
        renderOption: display?.renderOption ? renderEntityOption : undefined,
        renderOptionMeta: display?.renderOptionMeta
          ? renderEntityOptionMeta
          : undefined,
      }}
    />
  );
}
