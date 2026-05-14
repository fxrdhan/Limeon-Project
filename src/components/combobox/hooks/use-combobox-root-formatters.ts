import { useCallback } from 'react';
import {
  getDefaultComboboxItemLabel,
  getDefaultComboboxItemValue,
} from '../utils/primitive-root';

export function useComboboxRootFormatters<Value>({
  isItemDisabled: isItemDisabledProp,
  isItemEqualToValue: isItemEqualToValueProp,
  itemToStringLabel: itemToStringLabelProp,
  itemToStringValue: itemToStringValueProp,
}: {
  isItemDisabled?: (itemValue: Value) => boolean;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  itemToStringLabel?: (itemValue: Value) => string;
  itemToStringValue?: (itemValue: Value) => string;
}) {
  const itemToStringLabel = useCallback(
    (item: Value) =>
      itemToStringLabelProp
        ? itemToStringLabelProp(item)
        : getDefaultComboboxItemLabel(item),
    [itemToStringLabelProp]
  );
  const itemToStringValue = useCallback(
    (item: Value) =>
      itemToStringValueProp
        ? itemToStringValueProp(item)
        : getDefaultComboboxItemValue(item),
    [itemToStringValueProp]
  );
  const isItemEqualToValue = useCallback(
    (item: Value, value: Value) =>
      isItemEqualToValueProp
        ? isItemEqualToValueProp(item, value)
        : Object.is(item, value),
    [isItemEqualToValueProp]
  );
  const isItemDisabled = useCallback(
    (item: Value) => {
      if (isItemDisabledProp) return isItemDisabledProp(item);
      return false;
    },
    [isItemDisabledProp]
  );

  return {
    isItemDisabled,
    isItemEqualToValue,
    itemToStringLabel,
    itemToStringValue,
  };
}
