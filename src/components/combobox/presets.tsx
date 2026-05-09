import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TbChevronDown, TbPlus, TbSearch } from 'react-icons/tb';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { ComboboxOptionMotionFrame } from './components/combobox-option-motion-frame';
import {
  ComboboxSelectionIndicator,
  type ComboboxIndicatorKind,
} from './components/combobox-selection-indicator';
import { useComboboxKeyboardHighlightScroll } from './hooks/use-combobox-keyboard-highlight-scroll';
import { useComboboxHoverDetail } from './hooks/use-combobox-hover-detail';
import { Combobox, type ComboboxRootProps } from './index';
import {
  getComboboxControlName,
  getComboboxSelectedValue,
  getVisibleComboboxItems,
  hasExactComboboxItem,
  type ComboboxValueIsEmpty,
} from './utils/preset-state';

export type PharmaComboboxChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onValueChange']>
>[1];
export type PharmaComboboxOpenChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onOpenChange']>
>[1];
type BaseUIPreventableSyntheticEvent = React.SyntheticEvent & {
  preventBaseUIHandler?: () => void;
};
type ComboboxItemRecord = Partial<HoverDetailData> & {
  disabled?: boolean;
};

export interface PharmaComboboxSelectProps<Item> {
  id?: string;
  label?: string;
  name: string;
  items: Item[];
  value: Item | null;
  onValueChange: (
    item: Item | null,
    details: PharmaComboboxChangeDetails<Item>
  ) => void;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  isItemEqualToValue?: (item: Item, value: Item) => boolean;
  isItemDisabled?: (item: Item) => boolean;
  isValueEmpty?: ComboboxValueIsEmpty<Item>;
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  placeholder?: string;
  searchable?: boolean;
  indicator?: ComboboxIndicatorKind;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  form?: string;
  className?: string;
  popupClassName?: string;
  validation?: {
    enabled?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };
  createAction?: {
    label?: string;
    onCreate: (searchTerm?: string) => void;
  };
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
  open?: boolean;
  onOpenChange?: (
    open: boolean,
    details: PharmaComboboxOpenChangeDetails<Item>
  ) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const setRef = <Node,>(
  ref: React.Ref<Node> | undefined,
  value: Node | null
) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
};

const preventBaseUIHandler = (event: React.SyntheticEvent) => {
  (event as BaseUIPreventableSyntheticEvent).preventBaseUIHandler?.();
};

const highlightBackgroundTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};
const scrollHoverResumeDelay = 120;
const selectedOptionScrollTopInset = 4;
const requiredValidationMessage = 'Field ini wajib diisi';

const getComboboxItemRecord = <Item,>(item: Item): ComboboxItemRecord =>
  typeof item === 'object' && item !== null ? (item as ComboboxItemRecord) : {};

const getDefaultItemDisabled = <Item,>(item: Item) =>
  Boolean(getComboboxItemRecord(item).disabled);

const getDefaultHoverDetailData = <Item,>(
  item: Item
): Partial<HoverDetailData> => {
  const itemRecord = getComboboxItemRecord(item);

  return {
    display: itemRecord.display,
    data: itemRecord.data,
    code: itemRecord.code,
    description: itemRecord.description,
    metaLabel: itemRecord.metaLabel,
    metaTone: itemRecord.metaTone,
    created_at: itemRecord.created_at,
    createdAt: itemRecord.createdAt,
    updated_at: itemRecord.updated_at,
    updatedAt: itemRecord.updatedAt,
  };
};

const isElementVisibleInList = (element: HTMLElement, list: HTMLElement) => {
  const elementRect = element.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();

  if (elementRect.height === 0 && listRect.height === 0) return true;

  return (
    elementRect.bottom > listRect.top &&
    elementRect.top < listRect.bottom &&
    elementRect.right > listRect.left &&
    elementRect.left < listRect.right
  );
};

export function PharmaComboboxSelect<Item>({
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
  placeholder = '-- Pilih --',
  searchable = true,
  indicator = 'none',
  required = false,
  disabled = false,
  readOnly = false,
  tabIndex,
  form,
  className,
  popupClassName,
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
}: PharmaComboboxSelectProps<Item>) {
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupContentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const blurValidationFrameRef = useRef<number | null>(null);
  const listPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const keyboardHoverResumePointerPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const listScrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingScrollHoverRef = useRef<{
    item: Item;
    element: HTMLElement;
  } | null>(null);
  const isListScrollingRef = useRef(false);
  const isKeyboardNavigatingRef = useRef(false);
  const fallbackLabelId = useId();
  const valueId = useId();
  const validationMessageId = useId();
  const [inputValue, setInputValue] = useState('');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [visualHighlightedValue, setVisualHighlightedValue] =
    useState<Item | null>(null);
  const [visualHighlightedOptionId, setVisualHighlightedOptionId] = useState<
    string | undefined
  >(undefined);
  const visualHighlightedValueRef = useRef<Item | null>(null);
  const previousNormalizedInputValueRef = useRef('');
  const actualOpen = open ?? uncontrolledOpen;
  const selectedValue = useMemo(
    () => getComboboxSelectedValue(value, isValueEmpty),
    [isValueEmpty, value]
  );
  const showValidation =
    validation?.enabled && required && blurred && selectedValue == null;
  const normalizedInputValue = inputValue.trim();
  const visibleItems = useMemo(
    () =>
      getVisibleComboboxItems(items, normalizedInputValue, itemToStringLabel),
    [itemToStringLabel, items, normalizedInputValue]
  );
  const hasExactItem = useMemo(
    () => hasExactComboboxItem(items, normalizedInputValue, itemToStringLabel),
    [itemToStringLabel, items, normalizedInputValue]
  );
  const hasVisibleItems = visibleItems.length > 0;
  const canCreate = Boolean(
    createAction &&
    normalizedInputValue.length > 0 &&
    !hasVisibleItems &&
    !hasExactItem
  );
  const shouldAnimateListItems =
    normalizedInputValue.length > 0 && hasVisibleItems;
  const handleCreate = useCallback(() => {
    if (!canCreate) return;

    createAction?.onCreate(normalizedInputValue);
  }, [canCreate, createAction, normalizedInputValue]);

  const selectedLabel =
    selectedValue == null ? '' : itemToStringLabel(selectedValue);
  const isSameItem = useCallback(
    (item: Item, itemValue: Item) =>
      isItemEqualToValue
        ? isItemEqualToValue(item, itemValue)
        : Object.is(item, itemValue),
    [isItemEqualToValue]
  );
  const isItemDisabled = useCallback(
    (item: Item) => isItemDisabledProp(item),
    [isItemDisabledProp]
  );
  const selectedVisibleIndex = useMemo(
    () =>
      selectedValue == null
        ? -1
        : visibleItems.findIndex(item => isSameItem(item, selectedValue)),
    [isSameItem, selectedValue, visibleItems]
  );
  const firstHighlightableVisibleItem = useMemo(
    () => visibleItems.find(item => !isItemDisabled(item)) ?? null,
    [isItemDisabled, visibleItems]
  );
  const isItemVisibleAndEnabled = useCallback(
    (targetItem: Item) =>
      visibleItems.some(
        item => isSameItem(item, targetItem) && !isItemDisabled(item)
      ),
    [isItemDisabled, isSameItem, visibleItems]
  );
  const isItemVisuallyHighlighted = useCallback(
    (item: Item, baseHighlighted: boolean) =>
      visualHighlightedValue == null
        ? baseHighlighted
        : isSameItem(item, visualHighlightedValue),
    [isSameItem, visualHighlightedValue]
  );
  const isOpenControlled = open !== undefined;
  const controlName = getComboboxControlName({ label, name, placeholder });
  const triggerLabelledBy = ariaLabelledBy
    ? `${ariaLabelledBy} ${valueId}`
    : ariaLabel
      ? undefined
      : `${fallbackLabelId} ${valueId}`;
  const triggerDescribedBy =
    [ariaDescribedBy, showValidation ? validationMessageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  const hoverDetailEnabled =
    hoverDetail?.enabled ?? Boolean(onFetchHoverDetail);
  const {
    data: hoverDetailData,
    handleItemHover,
    handleItemLeave,
    hidePopover: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
  } = useComboboxHoverDetail({
    hoverDelay: hoverDetail?.delay ?? 800,
    isComboboxOpen: actualOpen,
    isEnabled: hoverDetailEnabled,
    onFetchData: onFetchHoverDetail,
    onFetchError: onFetchHoverDetailError,
  });
  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const id = itemToStringValue(item);
      const name = itemToStringLabel(item);
      const customData = itemToHoverDetailData?.(item);

      return {
        ...getDefaultHoverDetailData(item),
        ...customData,
        id,
        name,
      };
    },
    [itemToHoverDetailData, itemToStringLabel, itemToStringValue]
  );
  const runItemHoverDetail = useCallback(
    (
      item: Item,
      element: HTMLElement,
      options: { immediate?: boolean } = {}
    ) => {
      if (!hoverDetailEnabled) return;

      handleItemHover(
        itemToStringValue(item),
        element,
        getItemHoverDetailData(item),
        options
      );
    },
    [
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      itemToStringValue,
    ]
  );
  const updateListPointerPosition = useCallback(
    (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.PointerEvent<HTMLDivElement>
        | React.WheelEvent<HTMLDivElement>
    ) => {
      listPointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );
  const getOptionElementAtIndex = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) return null;

    return (
      listRef.current?.querySelector<HTMLElement>(
        `[data-pharma-combobox-index="${index}"]`
      ) ?? null
    );
  }, []);
  const {
    clearKeyboardScrollHighlight,
    heldHighlightFrame,
    scheduleKeyboardHighlightedScroll: schedulePinnedKeyboardHighlightedScroll,
  } = useComboboxKeyboardHighlightScroll({
    actualOpen,
    getOptionElementAtIndex,
    listRef,
    popupContentRef,
    visibleItemCount: visibleItems.length,
  });
  const getPointerHoverTarget = useCallback(() => {
    const pointerPosition = listPointerPositionRef.current;
    const list = listRef.current;
    if (
      !pointerPosition ||
      !list ||
      typeof document.elementFromPoint !== 'function'
    ) {
      return null;
    }

    const targetElement = document.elementFromPoint(
      pointerPosition.x,
      pointerPosition.y
    );
    const optionElement =
      targetElement instanceof HTMLElement
        ? targetElement.closest<HTMLElement>('[data-pharma-combobox-index]')
        : null;
    if (!optionElement || !list.contains(optionElement)) return null;
    if (!isElementVisibleInList(optionElement, list)) return null;

    const itemIndex = Number(optionElement.dataset.pharmaComboboxIndex);
    const item =
      Number.isInteger(itemIndex) && itemIndex >= 0
        ? visibleItems[itemIndex]
        : undefined;

    return item === undefined ? null : { item, element: optionElement };
  }, [visibleItems]);
  const flushScrollHover = useCallback(() => {
    isListScrollingRef.current = false;
    if (isKeyboardNavigatingRef.current) {
      pendingScrollHoverRef.current = null;
      return;
    }

    const pendingScrollHover = pendingScrollHoverRef.current;
    const hoverTarget =
      getPointerHoverTarget() ??
      (pendingScrollHover &&
      listRef.current &&
      isElementVisibleInList(pendingScrollHover.element, listRef.current)
        ? pendingScrollHover
        : null);
    pendingScrollHoverRef.current = null;

    if (!hoverTarget || isItemDisabled(hoverTarget.item)) return;

    clearKeyboardScrollHighlight();
    visualHighlightedValueRef.current = hoverTarget.item;
    setVisualHighlightedValue(hoverTarget.item);
    setVisualHighlightedOptionId(hoverTarget.element.id);
    runItemHoverDetail(hoverTarget.item, hoverTarget.element, {
      immediate: true,
    });
  }, [
    clearKeyboardScrollHighlight,
    getPointerHoverTarget,
    isItemDisabled,
    runItemHoverDetail,
  ]);
  const handleListScroll = useCallback(() => {
    if (!hoverDetailEnabled) return;

    isListScrollingRef.current = true;
    hideHoverDetail();

    if (listScrollEndTimeoutRef.current) {
      clearTimeout(listScrollEndTimeoutRef.current);
    }

    listScrollEndTimeoutRef.current = setTimeout(() => {
      listScrollEndTimeoutRef.current = null;
      flushScrollHover();
    }, scrollHoverResumeDelay);
  }, [flushScrollHover, hideHoverDetail, hoverDetailEnabled]);
  const handleOptionHover = useCallback(
    (item: Item, element: HTMLElement) => {
      if (isItemDisabled(item)) return;
      if (isKeyboardNavigatingRef.current) return;

      clearKeyboardScrollHighlight();
      visualHighlightedValueRef.current = item;
      setVisualHighlightedValue(item);
      setVisualHighlightedOptionId(element.id);

      if (!hoverDetailEnabled) return;

      if (isListScrollingRef.current) {
        pendingScrollHoverRef.current = { item, element };
        return;
      }

      runItemHoverDetail(item, element);
    },
    [
      clearKeyboardScrollHighlight,
      hoverDetailEnabled,
      isItemDisabled,
      runItemHoverDetail,
    ]
  );
  const handleListPointerMove = useCallback(
    (
      event:
        | React.MouseEvent<HTMLDivElement>
        | React.PointerEvent<HTMLDivElement>
    ) => {
      const pointerPosition = {
        x: event.clientX,
        y: event.clientY,
      };
      updateListPointerPosition(event);

      if (!isKeyboardNavigatingRef.current) return;

      const resumePointerPosition =
        keyboardHoverResumePointerPositionRef.current;
      const hasMovedPointer =
        !resumePointerPosition ||
        Math.abs(pointerPosition.x - resumePointerPosition.x) > 1 ||
        Math.abs(pointerPosition.y - resumePointerPosition.y) > 1;

      if (!hasMovedPointer) return;

      isKeyboardNavigatingRef.current = false;
      keyboardHoverResumePointerPositionRef.current = null;
      const hoverTarget = getPointerHoverTarget();
      if (!hoverTarget || isItemDisabled(hoverTarget.item)) return;

      handleOptionHover(hoverTarget.item, hoverTarget.element);
    },
    [
      getPointerHoverTarget,
      handleOptionHover,
      isItemDisabled,
      updateListPointerPosition,
    ]
  );
  const scheduleKeyboardHighlightedScroll = useCallback(
    (targetVisibleIndex: number, sourceVisibleIndex: number | null) => {
      isKeyboardNavigatingRef.current = true;
      keyboardHoverResumePointerPositionRef.current =
        listPointerPositionRef.current;
      schedulePinnedKeyboardHighlightedScroll(
        targetVisibleIndex,
        sourceVisibleIndex
      );
    },
    [schedulePinnedKeyboardHighlightedScroll]
  );
  const activeBackgroundLayoutId = `combobox-active-background-${instanceId}-${inputValue}`;
  const handleOpenChange = useCallback(
    (nextOpen: boolean, details: PharmaComboboxOpenChangeDetails<Item>) => {
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return;

      if (!isOpenControlled) setUncontrolledOpen(nextOpen);
    },
    [isOpenControlled, onOpenChange]
  );
  const navigateVisualHighlight = useCallback(
    (direction: 'next' | 'previous') => {
      const enabledItems = visibleItems.filter(item => !isItemDisabled(item));
      if (enabledItems.length === 0) return false;

      const currentItem =
        visualHighlightedValueRef.current ?? firstHighlightableVisibleItem;
      const currentIndex = currentItem
        ? enabledItems.findIndex(item => isSameItem(item, currentItem))
        : -1;
      const nextIndex =
        currentIndex < 0
          ? direction === 'next'
            ? 0
            : enabledItems.length - 1
          : direction === 'next'
            ? (currentIndex + 1) % enabledItems.length
            : (currentIndex - 1 + enabledItems.length) % enabledItems.length;
      const nextItem = enabledItems[nextIndex];
      if (!nextItem) return false;

      const sourceVisibleIndex = currentItem
        ? visibleItems.findIndex(item => isSameItem(item, currentItem))
        : null;
      const targetVisibleIndex = visibleItems.findIndex(item =>
        isSameItem(item, nextItem)
      );
      if (targetVisibleIndex < 0) return false;

      const targetElement = getOptionElementAtIndex(targetVisibleIndex);

      scheduleKeyboardHighlightedScroll(targetVisibleIndex, sourceVisibleIndex);
      visualHighlightedValueRef.current = nextItem;
      setVisualHighlightedValue(nextItem);
      setVisualHighlightedOptionId(targetElement?.id);
      return true;
    },
    [
      firstHighlightableVisibleItem,
      getOptionElementAtIndex,
      isItemDisabled,
      isSameItem,
      scheduleKeyboardHighlightedScroll,
      visibleItems,
    ]
  );
  const selectVisualHighlightedItem = useCallback(() => {
    const highlightedItem = visualHighlightedValueRef.current;
    if (highlightedItem == null || isItemDisabled(highlightedItem))
      return false;

    const targetVisibleIndex = visibleItems.findIndex(item =>
      isSameItem(item, highlightedItem)
    );
    const targetElement = getOptionElementAtIndex(targetVisibleIndex);
    if (!targetElement) return false;

    targetElement.click();
    return true;
  }, [getOptionElementAtIndex, isItemDisabled, isSameItem, visibleItems]);
  const isFocusWithinCombobox = useCallback((target: EventTarget | null) => {
    if (typeof Node === 'undefined' || !(target instanceof Node)) return false;

    return Boolean(
      rootRef.current?.contains(target) ||
      popupContentRef.current?.contains(target)
    );
  }, []);
  const handleComboboxBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (blurValidationFrameRef.current !== null) {
        window.cancelAnimationFrame(blurValidationFrameRef.current);
        blurValidationFrameRef.current = null;
      }

      const nextFocusedTarget = event.relatedTarget;
      if (isFocusWithinCombobox(nextFocusedTarget)) return;

      if (nextFocusedTarget || typeof window === 'undefined') {
        setBlurred(true);
        return;
      }

      blurValidationFrameRef.current = window.requestAnimationFrame(() => {
        blurValidationFrameRef.current = null;
        if (
          typeof document !== 'undefined' &&
          isFocusWithinCombobox(document.activeElement)
        ) {
          return;
        }

        setBlurred(true);
      });
    },
    [isFocusWithinCombobox]
  );
  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!searchable || !actualOpen) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const didNavigate = navigateVisualHighlight(
          event.key === 'ArrowDown' ? 'next' : 'previous'
        );
        if (!didNavigate) return;

        event.preventDefault();
        event.stopPropagation();
        preventBaseUIHandler(event);
        return;
      }

      if (
        event.key.length !== 1 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      preventBaseUIHandler(event);
      setInputValue(currentValue => `${currentValue}${event.key}`);
      clearKeyboardScrollHighlight();
      hideHoverDetail();
      searchInputRef.current?.focus({ preventScroll: true });
    },
    [
      actualOpen,
      clearKeyboardScrollHighlight,
      hideHoverDetail,
      navigateVisualHighlight,
      searchable,
    ]
  );

  useLayoutEffect(() => {
    if (!actualOpen) setInputValue('');
  }, [actualOpen]);

  useEffect(() => {
    if (actualOpen) return;

    hideHoverDetail();
    isKeyboardNavigatingRef.current = false;
    keyboardHoverResumePointerPositionRef.current = null;
    previousNormalizedInputValueRef.current = '';
    visualHighlightedValueRef.current = null;
    setVisualHighlightedValue(null);
    setVisualHighlightedOptionId(undefined);
  }, [actualOpen, hideHoverDetail]);

  useEffect(() => {
    if (!actualOpen) return;

    const didClearSearch =
      previousNormalizedInputValueRef.current.length > 0 &&
      normalizedInputValue.length === 0;
    previousNormalizedInputValueRef.current = normalizedInputValue;

    const selectedVisibleItem =
      selectedVisibleIndex >= 0
        ? (visibleItems[selectedVisibleIndex] ?? null)
        : null;

    const nextHighlightedValue =
      selectedVisibleItem && !isItemDisabled(selectedVisibleItem)
        ? selectedVisibleItem
        : firstHighlightableVisibleItem;
    const nextHighlightedIndex =
      nextHighlightedValue == null
        ? -1
        : visibleItems.findIndex(item =>
            isSameItem(item, nextHighlightedValue)
          );
    const nextHighlightedOptionId =
      getOptionElementAtIndex(nextHighlightedIndex)?.id;

    if (didClearSearch) {
      const alreadyHighlighted =
        nextHighlightedValue === null
          ? visualHighlightedValue === null
          : visualHighlightedValue !== null &&
            isSameItem(visualHighlightedValue, nextHighlightedValue);

      if (alreadyHighlighted) return;

      visualHighlightedValueRef.current = nextHighlightedValue;
      setVisualHighlightedValue(nextHighlightedValue);
      setVisualHighlightedOptionId(nextHighlightedOptionId);
      return;
    }

    if (
      visualHighlightedValue != null &&
      isItemVisibleAndEnabled(visualHighlightedValue)
    ) {
      return;
    }

    visualHighlightedValueRef.current = nextHighlightedValue;
    setVisualHighlightedValue(nextHighlightedValue);
    setVisualHighlightedOptionId(nextHighlightedOptionId);
  }, [
    actualOpen,
    firstHighlightableVisibleItem,
    getOptionElementAtIndex,
    isItemDisabled,
    isItemVisibleAndEnabled,
    isSameItem,
    normalizedInputValue,
    selectedVisibleIndex,
    visibleItems,
    visualHighlightedValue,
  ]);

  useEffect(() => {
    if (!actualOpen || selectedVisibleIndex < 0) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;

      const option = list.querySelector<HTMLElement>(
        `[data-pharma-combobox-index="${selectedVisibleIndex}"]`
      );
      if (!option) return;

      const listTop = list.getBoundingClientRect().top;
      const optionTop = option.getBoundingClientRect().top;
      list.scrollTop += optionTop - listTop - selectedOptionScrollTopInset;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [actualOpen, selectedVisibleIndex]);

  useEffect(() => {
    if (actualOpen) return;

    isListScrollingRef.current = false;
    pendingScrollHoverRef.current = null;
    listPointerPositionRef.current = null;
    keyboardHoverResumePointerPositionRef.current = null;
    if (listScrollEndTimeoutRef.current) {
      clearTimeout(listScrollEndTimeoutRef.current);
      listScrollEndTimeoutRef.current = null;
    }
  }, [actualOpen]);

  useEffect(
    () => () => {
      if (listScrollEndTimeoutRef.current) {
        clearTimeout(listScrollEndTimeoutRef.current);
      }
      if (blurValidationFrameRef.current !== null) {
        window.cancelAnimationFrame(blurValidationFrameRef.current);
      }
    },
    []
  );

  return (
    <div ref={rootRef} className={className} onBlur={handleComboboxBlur}>
      {!ariaLabelledBy && !ariaLabel ? (
        <span id={fallbackLabelId} className="sr-only">
          {controlName}
        </span>
      ) : null}
      <Combobox.Root<Item>
        items={items}
        value={selectedValue}
        onValueChange={(nextValue, details) => {
          onValueChange(nextValue, details);
          if (details.isCanceled) return;

          setInputValue('');
          hideHoverDetail();
        }}
        open={actualOpen}
        onOpenChange={handleOpenChange}
        inputValue={inputValue}
        onInputValueChange={nextValue => {
          setInputValue(nextValue);
          clearKeyboardScrollHighlight();
          hideHoverDetail();
        }}
        onItemHighlighted={(nextHighlighted, details) => {
          if (nextHighlighted === undefined) {
            if (details.reason === 'pointer') return;

            visualHighlightedValueRef.current = null;
            setVisualHighlightedValue(null);
            setVisualHighlightedOptionId(undefined);
            clearKeyboardScrollHighlight();
            return;
          }

          if (details.reason === 'pointer' && isKeyboardNavigatingRef.current) {
            return;
          }

          if (details.reason === 'keyboard') {
            const previousHighlightedValue = visualHighlightedValueRef.current;
            const sourceVisibleIndex =
              previousHighlightedValue == null
                ? null
                : visibleItems.findIndex(item =>
                    isSameItem(item, previousHighlightedValue)
                  );

            scheduleKeyboardHighlightedScroll(
              details.index,
              sourceVisibleIndex
            );
          } else {
            if (details.reason === 'pointer') {
              isKeyboardNavigatingRef.current = false;
              keyboardHoverResumePointerPositionRef.current = null;
            }
            clearKeyboardScrollHighlight();
          }

          const highlightedOptionElement = getOptionElementAtIndex(
            details.index
          );
          visualHighlightedValueRef.current = nextHighlighted;
          setVisualHighlightedValue(nextHighlighted);
          setVisualHighlightedOptionId(highlightedOptionElement?.id);
        }}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={itemToStringValue}
        isItemEqualToValue={isItemEqualToValue}
        name={name}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        filteredItems={visibleItems}
        filter={null}
        autoHighlight={searchable}
      >
        <Combobox.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-labelledby={triggerLabelledBy}
          aria-describedby={triggerDescribedBy}
          aria-invalid={showValidation || undefined}
          {...(visualHighlightedOptionId
            ? { 'aria-activedescendant': visualHighlightedOptionId }
            : {})}
          tabIndex={tabIndex}
          render={(props, state) => {
            const { ref, ...triggerProps } = props;

            return (
              <button
                {...triggerProps}
                type="button"
                ref={node => {
                  setRef(ref, node);
                }}
                onKeyDown={event => {
                  handleTriggerKeyDown(event);
                  if (event.defaultPrevented) return;

                  triggerProps.onKeyDown?.(event);
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm transition focus:border-primary focus:outline-hidden focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  showValidation
                    ? 'border-red-400'
                    : state.open
                      ? 'border-primary'
                      : 'border-slate-300'
                }`}
              >
                <span
                  id={valueId}
                  className={
                    selectedLabel ? 'truncate' : 'truncate text-slate-400'
                  }
                >
                  {selectedLabel || placeholder}
                </span>
                <TbChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                    state.open ? 'rotate-180' : ''
                  }`}
                />
              </button>
            );
          }}
        />
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={4}
            className="z-[1000] w-[var(--anchor-width)]"
          >
            <Combobox.Popup
              initialFocus={false}
              className={cn(
                'w-full',
                popupClassName ??
                  'overflow-hidden rounded-xl bg-white shadow-thin-md'
              )}
            >
              <div
                ref={popupContentRef}
                className="relative"
                onBlur={handleComboboxBlur}
              >
                {heldHighlightFrame ? (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                    style={heldHighlightFrame}
                    initial={false}
                    animate={heldHighlightFrame}
                    transition={highlightBackgroundTransition}
                  />
                ) : null}
                {searchable ? (
                  <div className="sticky top-0 z-20 border-b border-slate-200 bg-white p-2">
                    <div className="relative flex items-center">
                      <TbSearch
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute left-3 h-4 w-4',
                          normalizedInputValue
                            ? 'text-primary'
                            : 'text-slate-400'
                        )}
                      />
                      <Combobox.Input
                        ref={searchInputRef}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-10 text-sm text-slate-800 outline-hidden transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
                        aria-label={`Cari ${controlName}`}
                        {...(visualHighlightedOptionId
                          ? {
                              'aria-activedescendant':
                                visualHighlightedOptionId,
                            }
                          : {})}
                        placeholder="Cari..."
                        onKeyDown={event => {
                          if (
                            event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp'
                          ) {
                            const didNavigate = navigateVisualHighlight(
                              event.key === 'ArrowDown' ? 'next' : 'previous'
                            );
                            if (!didNavigate) return;

                            event.preventDefault();
                            event.stopPropagation();
                            preventBaseUIHandler(event);
                            return;
                          }

                          if (event.key !== 'Enter') return;

                          if (canCreate) {
                            event.preventDefault();
                            event.stopPropagation();
                            preventBaseUIHandler(event);
                            handleCreate();
                            return;
                          }

                          const didSelect = selectVisualHighlightedItem();
                          if (!didSelect) return;

                          event.preventDefault();
                          event.stopPropagation();
                          preventBaseUIHandler(event);
                        }}
                      />
                      {canCreate ? (
                        <button
                          type="button"
                          aria-label={createAction?.label ?? 'Tambah baru'}
                          className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-primary transition hover:bg-primary/10"
                          onMouseDown={event => event.preventDefault()}
                          onClick={handleCreate}
                        >
                          <TbPlus aria-hidden="true" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <Combobox.List
                  ref={listRef}
                  className={cn(
                    'relative z-10 overflow-y-auto outline-hidden',
                    hasVisibleItems ? 'max-h-60 p-1' : 'max-h-0 p-0'
                  )}
                  onMouseMove={handleListPointerMove}
                  onPointerMove={handleListPointerMove}
                  onWheel={updateListPointerPosition}
                  onScroll={handleListScroll}
                >
                  {hasVisibleItems ? (
                    <AnimatePresence initial={false} mode="popLayout">
                      {visibleItems.map((item, index) => (
                        <ComboboxOptionMotionFrame
                          key={itemToStringValue(item)}
                          shouldAnimate={shouldAnimateListItems}
                        >
                          <Combobox.Item
                            value={item}
                            index={index}
                            disabled={isItemDisabled(item)}
                            data-pharma-combobox-index={index.toString()}
                            onMouseEnter={event => {
                              listPointerPositionRef.current = {
                                x: event.clientX,
                                y: event.clientY,
                              };
                              handleOptionHover(item, event.currentTarget);
                            }}
                            onMouseLeave={() => {
                              if (isListScrollingRef.current) return;

                              handleItemLeave();
                            }}
                            render={(props, state) => {
                              const { ref, ...itemProps } = props;
                              const isVisuallyHighlighted =
                                isItemVisuallyHighlighted(
                                  item,
                                  state.highlighted
                                );

                              return (
                                <div
                                  {...itemProps}
                                  ref={node => {
                                    setRef(ref, node);
                                  }}
                                  data-pharma-combobox-index={index.toString()}
                                  className={cn(
                                    'relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-hidden',
                                    state.selected &&
                                      'font-semibold text-primary',
                                    state.disabled &&
                                      'cursor-not-allowed opacity-50'
                                  )}
                                >
                                  {isVisuallyHighlighted &&
                                  !heldHighlightFrame ? (
                                    <motion.div
                                      key={activeBackgroundLayoutId}
                                      layoutId={activeBackgroundLayoutId}
                                      initial={false}
                                      data-pharma-combobox-highlight=""
                                      className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10"
                                      transition={highlightBackgroundTransition}
                                    />
                                  ) : null}
                                  <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
                                    <ComboboxSelectionIndicator
                                      kind={indicator}
                                      selected={state.selected}
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                      {itemToStringLabel(item)}
                                    </span>
                                  </span>
                                </div>
                              );
                            }}
                          />
                        </ComboboxOptionMotionFrame>
                      ))}
                    </AnimatePresence>
                  ) : null}
                </Combobox.List>
                <Combobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                  Tidak ada data
                </Combobox.Empty>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {validation?.enabled ? (
        <span id={validationMessageId} className="sr-only">
          {showValidation ? requiredValidationMessage : ''}
        </span>
      ) : null}
      {validation?.enabled ? (
        <ValidationOverlay
          error={requiredValidationMessage}
          showError={Boolean(showValidation)}
          targetRef={rootRef}
          autoHide={validation.autoHide}
          autoHideDelay={validation.autoHideDelay}
          isOpen={actualOpen}
        />
      ) : null}
      {hoverDetailEnabled ? (
        <ComboboxHoverDetailPopover
          data={hoverDetailData}
          isVisible={isHoverDetailVisible}
          position={hoverDetailPosition}
        />
      ) : null}
    </div>
  );
}
