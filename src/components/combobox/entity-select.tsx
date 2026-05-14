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
  const isItemEqualToValue = itemConfig?.isEqualToValue;
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
      isUnavailableEntityValue(item)
        ? false
        : Boolean(itemConfig?.isDisabled?.(item)),
    [itemConfig]
  );
  const getIsValueEmpty = useCallback(
    (item: EntityComboboxValue<Item> | null) =>
      isUnavailableEntityValue(item)
        ? false
        : Boolean(itemConfig?.isValueEmpty?.(item)),
    [itemConfig]
  );
  const getItemHoverDetailData = useCallback(
    (item: EntityComboboxValue<Item>) =>
      isUnavailableEntityValue(item)
        ? {}
        : (itemConfig?.toHoverDetailData?.(item) ?? {}),
    [itemConfig]
  );
  const renderEntityOption = useCallback(
    (item: EntityComboboxValue<Item>, state: PharmaComboboxOptionRenderState) =>
      isUnavailableEntityValue(item)
        ? unavailableEntityItemLabel
        : display?.renderOption?.(item, state),
    [display]
  );
  const renderEntityOptionMeta = useCallback(
    (item: EntityComboboxValue<Item>, state: PharmaComboboxOptionRenderState) =>
      isUnavailableEntityValue(item)
        ? null
        : display?.renderOptionMeta?.(item, state),
    [display]
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
