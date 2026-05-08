import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import {
  TbCheck,
  TbChevronDown,
  TbCircle,
  TbCircleCheck,
  TbPlus,
  TbSearch,
  TbSquare,
  TbSquareCheck,
} from 'react-icons/tb';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
  hasKeyboardScrollTargetSettled,
  isWrappedKeyboardScroll,
  type KeyboardPinnedHighlightFrame,
} from '@/components/shared/keyboard-pinned-highlight';
import { ComboboxRootWithAlwaysAutoHighlight } from './base-ui-compat';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { useComboboxHoverDetail } from './hooks/use-combobox-hover-detail';
import { Combobox, type ComboboxRootProps } from './index';
import {
  getComboboxControlName,
  getComboboxSelectedValue,
  getVisibleComboboxItems,
  hasExactComboboxItem,
  type ComboboxValueIsEmpty,
} from './utils/preset-state';

type IndicatorKind = 'check' | 'radio' | 'checkbox' | 'none';
type PharmaComboboxChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onValueChange']>
>[1];
type BaseUIPreventableSyntheticEvent = React.SyntheticEvent & {
  preventBaseUIHandler?: () => void;
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
  isValueEmpty?: ComboboxValueIsEmpty<Item>;
  placeholder?: string;
  searchable?: boolean;
  indicator?: IndicatorKind;
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

const getIndicator = (kind: IndicatorKind, selected: boolean) => {
  if (kind === 'none') return null;
  if (kind === 'radio') {
    return selected ? (
      <TbCircleCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbCircle className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }
  if (kind === 'checkbox') {
    return selected ? (
      <TbSquareCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbSquare className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {selected ? <TbCheck className="h-4 w-4 text-primary" /> : null}
    </span>
  );
};

const highlightBackgroundTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};
const listOptionTransition = {
  layout: {
    type: 'spring' as const,
    stiffness: 520,
    damping: 38,
    mass: 0.7,
  },
  opacity: {
    duration: 0.1,
  },
  y: {
    duration: 0.1,
    ease: 'easeOut' as const,
  },
};
const scrollHoverResumeDelay = 120;
const selectedOptionScrollTopInset = 4;
const keyboardScrollHighlightMaxHold = 700;
const requiredValidationMessage = 'Field ini wajib diisi';

const isDisabledItem = <Item,>(item: Item) =>
  typeof item === 'object' &&
  item !== null &&
  'disabled' in item &&
  Boolean(item.disabled);

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

const scrollElementTo = (element: HTMLElement, top: number) => {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top, behavior: 'smooth' });
    return;
  }

  element.scrollTop = top;
};

function ComboboxOptionMotionFrame({
  children,
  shouldAnimate,
}: {
  children: React.ReactNode;
  shouldAnimate: boolean;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      aria-hidden={isPresent ? undefined : true}
      layout={shouldAnimate ? 'position' : false}
      initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: -6 } : undefined}
      transition={listOptionTransition}
    >
      {children}
    </motion.div>
  );
}

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
  isValueEmpty,
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
  const releaseHeldHighlightFrameRef = useRef<number | null>(null);
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
  const [heldHighlightFrame, setHeldHighlightFrame] =
    useState<KeyboardPinnedHighlightFrame | null>(null);
  const [pendingKeyboardScroll, setPendingKeyboardScroll] = useState<{
    sourceIndex: number | null;
    targetIndex: number;
  } | null>(null);
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
  const canCreate = Boolean(
    createAction &&
    normalizedInputValue.length > 0 &&
    visibleItems.length === 0 &&
    !hasExactItem
  );
  const shouldAnimateListItems = normalizedInputValue.length > 0;
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
  const selectedVisibleIndex = useMemo(
    () =>
      selectedValue == null
        ? -1
        : visibleItems.findIndex(item => isSameItem(item, selectedValue)),
    [isSameItem, selectedValue, visibleItems]
  );
  const firstHighlightableVisibleItem = useMemo(
    () => visibleItems.find(item => !isDisabledItem(item)) ?? null,
    [visibleItems]
  );
  const isItemVisibleAndEnabled = useCallback(
    (targetItem: Item) =>
      visibleItems.some(
        item => isSameItem(item, targetItem) && !isDisabledItem(item)
      ),
    [isSameItem, visibleItems]
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
  });
  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const itemRecord =
        typeof item === 'object' && item !== null
          ? (item as Partial<HoverDetailData>)
          : {};

      return {
        id: itemToStringValue(item),
        name: itemToStringLabel(item),
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
    },
    [itemToStringLabel, itemToStringValue]
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
  const clearKeyboardScrollHighlight = useCallback(() => {
    if (releaseHeldHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      releaseHeldHighlightFrameRef.current = null;
    }

    setPendingKeyboardScroll(null);
    setHeldHighlightFrame(null);
  }, []);
  const getOptionElementAtIndex = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) return null;

    return (
      listRef.current?.querySelector<HTMLElement>(
        `[data-pharma-combobox-index="${index}"]`
      ) ?? null
    );
  }, []);
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

    if (!hoverTarget || isDisabledItem(hoverTarget.item)) return;

    clearKeyboardScrollHighlight();
    visualHighlightedValueRef.current = hoverTarget.item;
    setVisualHighlightedValue(hoverTarget.item);
    setVisualHighlightedOptionId(hoverTarget.element.id);
    runItemHoverDetail(hoverTarget.item, hoverTarget.element, {
      immediate: true,
    });
  }, [clearKeyboardScrollHighlight, getPointerHoverTarget, runItemHoverDetail]);
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
      if (isDisabledItem(item)) return;
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
    [clearKeyboardScrollHighlight, hoverDetailEnabled, runItemHoverDetail]
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
      if (!hoverTarget || isDisabledItem(hoverTarget.item)) return;

      handleOptionHover(hoverTarget.item, hoverTarget.element);
    },
    [getPointerHoverTarget, handleOptionHover, updateListPointerPosition]
  );
  const scheduleKeyboardHighlightedScroll = useCallback(
    (targetVisibleIndex: number, sourceVisibleIndex: number | null) => {
      if (
        !Number.isInteger(targetVisibleIndex) ||
        targetVisibleIndex < 0 ||
        targetVisibleIndex >= visibleItems.length
      ) {
        clearKeyboardScrollHighlight();
        return;
      }

      const list = listRef.current;
      const targetElement = list?.querySelector<HTMLElement>(
        `[data-pharma-combobox-index="${targetVisibleIndex}"]`
      );
      const scrollTarget =
        list && targetElement
          ? getKeyboardScrollTarget({
              container: list,
              itemCount: visibleItems.length,
              targetElement,
              targetIndex: targetVisibleIndex,
            })
          : null;

      isKeyboardNavigatingRef.current = true;
      keyboardHoverResumePointerPositionRef.current =
        listPointerPositionRef.current;
      if (scrollTarget) {
        setPendingKeyboardScroll({
          sourceIndex:
            sourceVisibleIndex === null || sourceVisibleIndex < 0
              ? null
              : sourceVisibleIndex,
          targetIndex: targetVisibleIndex,
        });
        return;
      }

      clearKeyboardScrollHighlight();
    },
    [clearKeyboardScrollHighlight, visibleItems.length]
  );
  const activeBackgroundLayoutId = `combobox-active-background-${instanceId}-${inputValue}`;
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setUncontrolledOpen(nextOpen);
      if (!nextOpen) {
        hideHoverDetail();
        isKeyboardNavigatingRef.current = false;
        keyboardHoverResumePointerPositionRef.current = null;
        clearKeyboardScrollHighlight();
        visualHighlightedValueRef.current = null;
        setVisualHighlightedValue(null);
        setVisualHighlightedOptionId(undefined);
        if (!isOpenControlled) setInputValue('');
      }
      onOpenChange?.(nextOpen);
    },
    [
      clearKeyboardScrollHighlight,
      hideHoverDetail,
      isOpenControlled,
      onOpenChange,
    ]
  );
  const navigateVisualHighlight = useCallback(
    (direction: 'next' | 'previous') => {
      const enabledItems = visibleItems.filter(item => !isDisabledItem(item));
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
      isSameItem,
      scheduleKeyboardHighlightedScroll,
      visibleItems,
    ]
  );
  const selectVisualHighlightedItem = useCallback(() => {
    const highlightedItem = visualHighlightedValueRef.current;
    if (highlightedItem == null || isDisabledItem(highlightedItem))
      return false;

    const targetVisibleIndex = visibleItems.findIndex(item =>
      isSameItem(item, highlightedItem)
    );
    const targetElement = getOptionElementAtIndex(targetVisibleIndex);
    if (!targetElement) return false;

    targetElement.click();
    return true;
  }, [getOptionElementAtIndex, isSameItem, visibleItems]);
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
    if (open === false) setInputValue('');
  }, [open]);

  useEffect(() => {
    if (!actualOpen || pendingKeyboardScroll === null) return;

    const list = listRef.current;
    const popupContent = popupContentRef.current;
    const targetElement = list?.querySelector<HTMLElement>(
      `[data-pharma-combobox-index="${pendingKeyboardScroll.targetIndex}"]`
    );
    const sourceElement =
      pendingKeyboardScroll.sourceIndex === null
        ? null
        : list?.querySelector<HTMLElement>(
            `[data-pharma-combobox-index="${pendingKeyboardScroll.sourceIndex}"]`
          );

    if (!list || !popupContent || !targetElement) {
      clearKeyboardScrollHighlight();
      return;
    }

    const scrollTarget = getKeyboardScrollTarget({
      container: list,
      itemCount: visibleItems.length,
      targetElement,
      targetIndex: pendingKeyboardScroll.targetIndex,
    });

    if (scrollTarget === null) {
      clearKeyboardScrollHighlight();
      return;
    }

    if (releaseHeldHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      releaseHeldHighlightFrameRef.current = null;
    }

    setHeldHighlightFrame(
      getKeyboardPinnedHighlightFrame({
        container: list,
        forceTargetEdgeFrame: isWrappedKeyboardScroll({
          itemCount: visibleItems.length,
          sourceIndex: pendingKeyboardScroll.sourceIndex,
          targetIndex: pendingKeyboardScroll.targetIndex,
        }),
        frameRootElement: popupContent,
        scrollDirection: scrollTarget.direction,
        sourceElement,
        targetElement,
      })
    );
    scrollElementTo(list, scrollTarget.scrollTop);

    const startedAt = window.performance.now();
    const releaseWhenSettled = () => {
      const currentList = listRef.current;
      const currentTargetElement = currentList?.querySelector<HTMLElement>(
        `[data-pharma-combobox-index="${pendingKeyboardScroll.targetIndex}"]`
      );

      if (!currentList || !currentTargetElement) {
        clearKeyboardScrollHighlight();
        return;
      }

      const hasHeldLongEnough =
        window.performance.now() - startedAt >= keyboardScrollHighlightMaxHold;

      if (
        hasKeyboardScrollTargetSettled({
          container: currentList,
          scrollTop: scrollTarget.scrollTop,
          targetElement: currentTargetElement,
        }) ||
        hasHeldLongEnough
      ) {
        clearKeyboardScrollHighlight();
        return;
      }

      releaseHeldHighlightFrameRef.current =
        window.requestAnimationFrame(releaseWhenSettled);
    };

    releaseHeldHighlightFrameRef.current =
      window.requestAnimationFrame(releaseWhenSettled);
  }, [
    actualOpen,
    clearKeyboardScrollHighlight,
    pendingKeyboardScroll,
    visibleItems.length,
  ]);

  useEffect(() => {
    if (!actualOpen) {
      clearKeyboardScrollHighlight();
      keyboardHoverResumePointerPositionRef.current = null;
      previousNormalizedInputValueRef.current = '';
      visualHighlightedValueRef.current = null;
      setVisualHighlightedValue(null);
      setVisualHighlightedOptionId(undefined);
      return;
    }

    const didClearSearch =
      previousNormalizedInputValueRef.current.length > 0 &&
      normalizedInputValue.length === 0;
    previousNormalizedInputValueRef.current = normalizedInputValue;

    const selectedVisibleItem =
      selectedVisibleIndex >= 0
        ? (visibleItems[selectedVisibleIndex] ?? null)
        : null;

    const nextHighlightedValue =
      selectedVisibleItem && !isDisabledItem(selectedVisibleItem)
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
    clearKeyboardScrollHighlight,
    firstHighlightableVisibleItem,
    getOptionElementAtIndex,
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
      if (releaseHeldHighlightFrameRef.current !== null) {
        window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      }
    },
    []
  );

  return (
    <div ref={rootRef} className={className}>
      {!ariaLabelledBy && !ariaLabel ? (
        <span id={fallbackLabelId} className="sr-only">
          {controlName}
        </span>
      ) : null}
      <ComboboxRootWithAlwaysAutoHighlight<Item>
        items={items}
        value={selectedValue}
        onValueChange={(nextValue, details) => {
          onValueChange(nextValue, details);
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
        autoHighlight="always"
        keepHighlight
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
                onBlur={event => {
                  triggerProps.onBlur?.(event);
                  setBlurred(true);
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
              <div ref={popupContentRef} className="relative">
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
                  className="relative z-10 max-h-60 overflow-y-auto p-1 outline-hidden"
                  onMouseMove={handleListPointerMove}
                  onPointerMove={handleListPointerMove}
                  onWheel={updateListPointerPosition}
                  onScroll={handleListScroll}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {visibleItems.map((item, index) => (
                      <ComboboxOptionMotionFrame
                        key={itemToStringValue(item)}
                        shouldAnimate={shouldAnimateListItems}
                      >
                        <Combobox.Item
                          value={item}
                          index={index}
                          disabled={isDisabledItem(item)}
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
                                  {getIndicator(indicator, state.selected)}
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
                </Combobox.List>
                <Combobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                  Tidak ada data
                </Combobox.Empty>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </ComboboxRootWithAlwaysAutoHighlight>
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
