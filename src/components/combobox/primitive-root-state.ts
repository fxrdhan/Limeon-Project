import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type React from 'react';
import type {
  ComboboxContextValue,
  ComboboxItemMeta,
} from './primitive-context';
import {
  createComboboxEventDetails as createEventDetails,
  createComboboxHighlightEventDetails as createHighlightEventDetails,
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
  type ComboboxHighlightEventDetails,
} from './utils/primitive-events';
import { getNextEnabledIndex } from './utils/primitive-keyboard';
import { useComboboxOutsidePress } from './utils/primitive-outside-press';
import {
  getDefaultComboboxItemLabel,
  getDefaultComboboxItemValue,
  normalizeComboboxHighlightedIndex,
} from './utils/primitive-root';

export type ComboboxRootProps<Value> = {
  autoComplete?: string;
  autoHighlight?: boolean;
  children?: React.ReactNode;
  defaultHighlightedIndex?: number | null;
  defaultInputValue?: string;
  defaultOpen?: boolean;
  defaultValue?: Value | null;
  disabled?: boolean;
  filter?:
    | null
    | ((
        itemValue: Value,
        query: string,
        itemToString?: (itemValue: Value) => string
      ) => boolean);
  filteredItems?: readonly Value[];
  form?: string;
  highlightItemOnHover?: boolean;
  highlightedIndex?: number | null;
  inputValue?: string;
  isItemDisabled?: (itemValue: Value) => boolean;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  itemToStringLabel?: (itemValue: Value) => string;
  itemToStringValue?: (itemValue: Value) => string;
  labelId?: string;
  items?: readonly Value[];
  name?: string;
  onInputValueChange?: (
    inputValue: string,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onHighlightedIndexChange?: (
    highlightedIndex: number | null,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onItemHighlighted?: (
    itemValue: Value | undefined,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onOpenChange?: (
    open: boolean,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onValueChange?: (
    value: Value | null,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: Value | null;
};

export type ComboboxHiddenInputState = {
  disabled: boolean;
  form?: string;
  name?: string;
  readOnly: boolean;
  value: string;
};

type ComboboxRootStateProps<Value> = Omit<ComboboxRootProps<Value>, 'children'>;

export function useComboboxRootState<Value>({
  autoComplete,
  autoHighlight = false,
  defaultInputValue = '',
  defaultHighlightedIndex = null,
  defaultOpen = false,
  defaultValue = null,
  disabled = false,
  filter,
  filteredItems: filteredItemsProp,
  form,
  highlightItemOnHover = true,
  highlightedIndex: highlightedIndexProp,
  inputValue: inputValueProp,
  isItemDisabled: isItemDisabledProp,
  isItemEqualToValue: isItemEqualToValueProp,
  itemToStringLabel: itemToStringLabelProp,
  itemToStringValue: itemToStringValueProp,
  labelId: labelIdProp,
  items = [],
  name,
  onHighlightedIndexChange,
  onInputValueChange,
  onItemHighlighted,
  onOpenChange,
  onValueChange,
  open: openProp,
  readOnly = false,
  required = false,
  value: valueProp,
}: ComboboxRootStateProps<Value>) {
  const generatedId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLElement | null>(null);
  const itemMetaRef = useRef(new Map<number, ComboboxItemMeta<Value>>());
  const filteredItemsRef = useRef<Value[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    useState(defaultInputValue);
  const [uncontrolledHighlightedIndex, setUncontrolledHighlightedIndex] =
    useState<number | null>(defaultHighlightedIndex);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | null>(
    defaultValue
  );
  const [registeredLabelIds, setRegisteredLabelIds] = useState<string[]>([]);
  const [triggerId, setTriggerIdState] = useState(`${generatedId}-trigger`);

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
  const isItemIndexDisabled = useCallback(
    (index: number) => {
      const item = filteredItemsRef.current[index];
      if (item === undefined) return true;

      const meta = itemMetaRef.current.get(index);
      if (meta?.value === item) return meta.disabled || isItemDisabled(item);

      return isItemDisabled(item);
    },
    [isItemDisabled]
  );

  const inputValue =
    inputValueProp !== undefined ? inputValueProp : uncontrolledInputValue;
  const open = openProp !== undefined ? openProp : uncontrolledOpen;
  const selectedValue = (
    valueProp !== undefined ? valueProp : uncontrolledValue
  ) as Value | null;

  const filteredItems = useMemo(() => {
    if (filteredItemsProp !== undefined) return Array.from(filteredItemsProp);
    if (filter === null || inputValue.trim() === '') return Array.from(items);

    const query = inputValue.trim();
    return Array.from(items).filter(item =>
      filter
        ? filter(item, query, itemToStringLabel)
        : itemToStringLabel(item)
            .toLocaleLowerCase('id-ID')
            .includes(query.toLocaleLowerCase('id-ID'))
    );
  }, [filter, filteredItemsProp, inputValue, itemToStringLabel, items]);

  const activeIndexState = normalizeComboboxHighlightedIndex(
    highlightedIndexProp !== undefined
      ? highlightedIndexProp
      : uncontrolledHighlightedIndex,
    filteredItems.length
  );

  filteredItemsRef.current = filteredItems;
  activeIndexRef.current = activeIndexState;

  const setOpen = useCallback(
    (
      nextOpen: boolean,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (open === nextOpen) return true;

      const details = createEventDetails(reason, event);
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return false;
      if (openProp === undefined) setUncontrolledOpen(nextOpen);
      return true;
    },
    [onOpenChange, open, openProp]
  );

  const setInputValue = useCallback(
    (
      nextValue: string,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (inputValue === nextValue) return true;

      const details = createEventDetails(reason, event);
      onInputValueChange?.(nextValue, details);
      if (details.isCanceled) return false;
      if (inputValueProp === undefined) setUncontrolledInputValue(nextValue);
      return true;
    },
    [inputValue, inputValueProp, onInputValueChange]
  );

  const setActiveIndex = useCallback(
    (
      nextIndex: number | null,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      const normalizedIndex = normalizeComboboxHighlightedIndex(
        nextIndex,
        filteredItemsRef.current.length
      );
      const nextValue =
        normalizedIndex === null
          ? undefined
          : filteredItemsRef.current[normalizedIndex];
      const currentIndex = activeIndexRef.current;
      const currentValue =
        currentIndex === null
          ? undefined
          : filteredItemsRef.current[currentIndex];
      const sameIndex = currentIndex === normalizedIndex;
      const sameValue =
        currentValue === undefined || nextValue === undefined
          ? currentValue === nextValue
          : isItemEqualToValue(currentValue, nextValue);

      if (sameIndex && sameValue) return;

      const details = createHighlightEventDetails(
        reason,
        normalizedIndex ?? -1,
        event
      );
      onItemHighlighted?.(nextValue, details);
      if (details.isCanceled) return;
      onHighlightedIndexChange?.(normalizedIndex, details);
      if (details.isCanceled) return;

      activeIndexRef.current = normalizedIndex;
      if (highlightedIndexProp === undefined) {
        setUncontrolledHighlightedIndex(normalizedIndex);
      }
    },
    [
      highlightedIndexProp,
      isItemEqualToValue,
      onHighlightedIndexChange,
      onItemHighlighted,
    ]
  );

  const selectItem = useCallback(
    (
      item: Value,
      reason: EventReason,
      event?: React.SyntheticEvent | Event,
      index?: number
    ) => {
      if (
        disabled ||
        readOnly ||
        (index !== undefined
          ? isItemIndexDisabled(index)
          : isItemDisabled(item))
      ) {
        return false;
      }

      const details = createEventDetails(reason, event);
      onValueChange?.(item, details);
      if (details.isCanceled) return false;
      if (valueProp === undefined) {
        setUncontrolledValue(item);
      }
      setOpen(false, reason, event);
      return true;
    },
    [
      disabled,
      isItemDisabled,
      isItemIndexDisabled,
      onValueChange,
      readOnly,
      setOpen,
      valueProp,
    ]
  );
  const selectActiveItem = useCallback(
    (
      reason: EventReason,
      event?: React.SyntheticEvent | Event,
      options?: { preventDefault?: boolean }
    ) => {
      const activeIndex = activeIndexRef.current;
      if (activeIndex === null || isItemIndexDisabled(activeIndex))
        return false;

      const activeItem = filteredItemsRef.current[activeIndex];
      if (activeItem === undefined) return false;

      if (options?.preventDefault) event?.preventDefault();
      return selectItem(activeItem, reason, event, activeIndex);
    },
    [isItemIndexDisabled, selectItem]
  );

  const registerItem = useCallback(
    (index: number, meta: ComboboxItemMeta<Value>) => {
      itemMetaRef.current.set(index, meta);
      return () => {
        const currentMeta = itemMetaRef.current.get(index);
        if (currentMeta?.value === meta.value) {
          itemMetaRef.current.delete(index);
        }
      };
    },
    []
  );

  const getItemId = useCallback(
    (index: number) => `${generatedId}-option-${index}`,
    [generatedId]
  );
  const getNextEnabledComboboxIndex = useCallback(
    (direction: 1 | -1, fromIndex: number | null) =>
      getNextEnabledIndex({
        direction,
        fromIndex,
        isIndexDisabled: isItemIndexDisabled,
        itemCount: filteredItemsRef.current.length,
      }),
    [isItemIndexDisabled]
  );
  const setTriggerId = useCallback((nextTriggerId: string) => {
    setTriggerIdState(currentTriggerId =>
      currentTriggerId === nextTriggerId ? currentTriggerId : nextTriggerId
    );
  }, []);
  const registerLabelId = useCallback((nextLabelId: string) => {
    setRegisteredLabelIds(currentLabelIds => [...currentLabelIds, nextLabelId]);
    return () => {
      setRegisteredLabelIds(currentLabelIds => {
        const labelIndex = currentLabelIds.indexOf(nextLabelId);
        if (labelIndex < 0) return currentLabelIds;

        return [
          ...currentLabelIds.slice(0, labelIndex),
          ...currentLabelIds.slice(labelIndex + 1),
        ];
      });
    };
  }, []);

  const handleOutsidePress = useCallback(
    (event: PointerEvent) => {
      setOpen(false, 'outside-press', event);
    },
    [setOpen]
  );
  useComboboxOutsidePress({
    enabled: open,
    onOutsidePress: handleOutsidePress,
    popupRef,
    triggerRef,
  });

  useEffect(() => {
    if (!open) {
      setActiveIndex(null, 'none');
      return;
    }

    if (filteredItems.length === 0) {
      setActiveIndex(null, 'none');
      return;
    }

    if (!autoHighlight) {
      if (
        activeIndexRef.current !== null &&
        activeIndexRef.current >= filteredItems.length
      ) {
        setActiveIndex(null, 'none');
      }
      return;
    }

    if (
      activeIndexRef.current !== null &&
      activeIndexRef.current < filteredItems.length &&
      !isItemIndexDisabled(activeIndexRef.current)
    ) {
      setActiveIndex(activeIndexRef.current, 'none');
      return;
    }

    setActiveIndex(
      getNextEnabledIndex({
        direction: 1,
        fromIndex: null,
        isIndexDisabled: isItemIndexDisabled,
        itemCount: filteredItems.length,
      }),
      'none'
    );
  }, [autoHighlight, filteredItems, isItemIndexDisabled, open, setActiveIndex]);

  const context = useMemo<ComboboxContextValue<Value>>(
    () => ({
      activeIndex: activeIndexState,
      autoComplete,
      autoHighlight,
      defaultLabelId: `${generatedId}-label`,
      disabled,
      filteredItems,
      form,
      getItemId,
      getNextEnabledIndex: getNextEnabledComboboxIndex,
      highlightedIndexRef: activeIndexRef,
      highlightItemOnHover,
      inputId: `${generatedId}-input`,
      inputValue,
      isItemDisabled,
      isItemIndexDisabled,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      labelId:
        labelIdProp ??
        (registeredLabelIds.length > 0
          ? Array.from(new Set(registeredLabelIds)).join(' ')
          : undefined),
      listboxId: `${generatedId}-listbox`,
      name,
      open,
      popupRef,
      readOnly,
      registerItem,
      registerLabelId,
      required,
      selectActiveItem,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setOpen,
      setTriggerId,
      selectItem,
      triggerId,
      triggerRef,
    }),
    [
      activeIndexState,
      autoComplete,
      autoHighlight,
      disabled,
      filteredItems,
      form,
      generatedId,
      getItemId,
      getNextEnabledComboboxIndex,
      highlightItemOnHover,
      inputValue,
      isItemDisabled,
      isItemIndexDisabled,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      labelIdProp,
      name,
      open,
      readOnly,
      registeredLabelIds,
      registerLabelId,
      registerItem,
      required,
      selectActiveItem,
      selectedValue,
      setActiveIndex,
      setInputValue,
      setOpen,
      setTriggerId,
      selectItem,
      triggerId,
    ]
  );

  const hiddenValue =
    selectedValue === null ? '' : itemToStringValue(selectedValue);
  const hiddenInputProps = useMemo<ComboboxHiddenInputState>(
    () => ({
      disabled,
      form,
      name,
      readOnly,
      value: hiddenValue,
    }),
    [disabled, form, hiddenValue, name, readOnly]
  );

  return {
    context,
    hiddenInputProps,
  };
}
