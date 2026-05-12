import { useCallback } from 'react';
import type { PharmaComboboxSelectProps } from '../presets-types';
import { useComboboxCreateAction } from './use-combobox-create-action';
import { useComboboxDuplicateValueWarning } from './use-combobox-duplicate-value-warning';
import { useComboboxSearch } from './use-combobox-search';

type PharmaComboboxSelectionModelProps<Item> = Pick<
  PharmaComboboxSelectProps<Item>,
  | 'createAction'
  | 'isItemEqualToValue'
  | 'itemToStringLabel'
  | 'itemToStringValue'
  | 'items'
  | 'name'
  | 'visibleItemLimit'
> & {
  inputValue: string;
  isItemDisabledProp: (item: Item) => boolean;
  selectedValue: Item | null;
};

export function usePharmaComboboxSelectionModel<Item>({
  createAction,
  inputValue,
  isItemDisabledProp,
  isItemEqualToValue,
  itemToStringLabel,
  itemToStringValue,
  items,
  name,
  selectedValue,
  visibleItemLimit,
}: PharmaComboboxSelectionModelProps<Item>) {
  const isSameItem = useCallback(
    (item: Item, itemValue: Item) =>
      isItemEqualToValue
        ? isItemEqualToValue(item, itemValue)
        : Object.is(item, itemValue),
    [isItemEqualToValue]
  );
  const { hasExactItem, hasVisibleItems, normalizedInputValue, visibleItems } =
    useComboboxSearch({
      inputValue,
      isSameItem,
      itemToStringLabel,
      items,
      selectedValue,
      visibleItemLimit,
    });
  const { canCreate, createActionLabel, handleCreate } =
    useComboboxCreateAction({
      createAction,
      hasExactItem,
      hasVisibleItems,
      normalizedInputValue,
    });
  const isItemDisabled = useCallback(
    (item: Item) => isItemDisabledProp(item),
    [isItemDisabledProp]
  );

  useComboboxDuplicateValueWarning({
    itemToStringValue,
    items,
    name,
  });

  return {
    canCreate,
    createActionLabel,
    handleCreate,
    hasVisibleItems,
    isItemDisabled,
    isSameItem,
    normalizedInputValue,
    visibleItems,
  };
}
