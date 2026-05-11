import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useFormFieldContext } from '@/components/form-field/context';
import type { HoverDetailData } from '@/types/components';
import type { ComboboxRootProps } from '../primitive';
import type {
  PharmaComboboxChangeDetails,
  PharmaComboboxSelectProps,
} from '../presets-types';
import { useComboboxAccessibility } from './use-combobox-accessibility';
import { useComboboxCreateAction } from './use-combobox-create-action';
import { useComboboxFocusRestore } from './use-combobox-focus-restore';
import { useComboboxHighlight } from './use-combobox-highlight';
import { useComboboxHoverDetail } from './use-combobox-hover-detail';
import { useComboboxKeyboardHighlightScroll } from './use-combobox-keyboard-highlight-scroll';
import { useComboboxPointerHover } from './use-combobox-pointer-hover';
import { useComboboxSearch } from './use-combobox-search';
import { useComboboxSearchResultScroll } from './use-combobox-search-result-scroll';
import { useComboboxSelectedOptionScroll } from './use-combobox-selected-option-scroll';
import { useComboboxValidation } from './use-combobox-validation';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';
import {
  getDefaultHoverDetailData,
  getDefaultItemDisabled,
} from '../utils/preset-item';
import {
  getComboboxSelectedValue,
  getDuplicateComboboxOptionValue,
} from '../utils/preset-state';

const keyboardHoverDetailSyncDelay = 90;
const scrollHoverDetailActivityResetDelay = 180;
const scrollHoverDetailBurstWindow = 180;
const scrollHoverDetailFastDistance = 72;
const scrollHoverDetailResumeDelay = 140;

type ListScrollActivity = {
  accumulatedDistance: number;
  initialized: boolean;
  lastAt: number;
  lastTop: number;
  suspended: boolean;
};

const createListScrollActivity = (): ListScrollActivity => ({
  accumulatedDistance: 0,
  initialized: false,
  lastAt: 0,
  lastTop: 0,
  suspended: false,
});

type PharmaComboboxRootBoundaryProps<Item> = Pick<
  ComboboxRootProps<Item>,
  | 'autoHighlight'
  | 'disabled'
  | 'filter'
  | 'filteredItems'
  | 'form'
  | 'highlightedIndex'
  | 'inputValue'
  | 'isItemDisabled'
  | 'isItemEqualToValue'
  | 'itemToStringLabel'
  | 'itemToStringValue'
  | 'items'
  | 'labelId'
  | 'name'
  | 'onHighlightedIndexChange'
  | 'onInputValueChange'
  | 'onItemHighlighted'
  | 'onOpenChange'
  | 'onValueChange'
  | 'open'
  | 'readOnly'
  | 'required'
  | 'value'
>;

export function usePharmaComboboxSelectController<Item>({
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
  renderOption,
  renderOptionMeta,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data',
  visibleItemLimit,
  searchable = true,
  indicator = 'none',
  required = false,
  disabled = false,
  readOnly = false,
  tabIndex,
  form,
  className,
  popupClassName,
  popupMatchAnchorWidth = true,
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
  const formField = useFormFieldContext();
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupContentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const keyboardHoverDetailSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const scrollHoverDetailResumeTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const scrollHoverDetailActivityResetTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const shouldResumeHoverDetailAfterScrollRef = useRef(false);
  const isHoverDetailVisibleRef = useRef(false);
  const listScrollActivityRef = useRef<ListScrollActivity>(
    createListScrollActivity()
  );
  const fallbackLabelId = useId();
  const valueId = useId();
  const warnedDuplicateValueRef = useRef<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isSearchNavigationFocus, setIsSearchNavigationFocus] = useState(false);

  const actualOpen = open !== undefined ? open : uncontrolledOpen;
  const previousActualOpenRef = useRef(actualOpen);
  const isOpenControlled = open !== undefined;
  const effectiveId = id ?? formField?.controlId;
  const effectiveLabel = label ?? formField?.label;
  const effectiveRequired = required || Boolean(formField?.required);
  const selectedValue = useMemo(
    () => getComboboxSelectedValue(value, isValueEmpty),
    [isValueEmpty, value]
  );
  const {
    clearFocusRestoreIntent,
    handleOpenChange,
    isFocusWithinCombobox,
    restoreFocusAfterCloseIfNeeded,
    setTriggerButtonRef,
  } = useComboboxFocusRestore<Item>({
    isOpenControlled,
    onOpenChange,
    popupContentRef,
    rootRef,
    setUncontrolledOpen,
  });
  const { handleComboboxBlur, showValidation, validationMessageId } =
    useComboboxValidation({
      effectiveRequired,
      isFocusWithinCombobox,
      selectedValue,
      validation,
    });
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
  const shouldAnimateListItems =
    normalizedInputValue.length > 0 && hasVisibleItems;
  const selectedLabel =
    selectedValue == null ? '' : itemToStringLabel(selectedValue);
  const isItemDisabled = useCallback(
    (item: Item) => isItemDisabledProp(item),
    [isItemDisabledProp]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const duplicateValue = getDuplicateComboboxOptionValue(
      items,
      itemToStringValue
    );
    if (duplicateValue === null) {
      warnedDuplicateValueRef.current = null;
      return;
    }

    const warningKey = `${name ?? ''}:${duplicateValue}`;
    if (warnedDuplicateValueRef.current === warningKey) return;

    warnedDuplicateValueRef.current = warningKey;
    console.warn(
      `[PharmaComboboxSelect] Duplicate itemToStringValue "${duplicateValue}" detected for ${
        name ?? 'unnamed combobox'
      }. Combobox option values must be unique because hidden form submission uses itemToStringValue.`
    );
  }, [itemToStringValue, items, name]);

  const { requestSelectedOptionScroll } = useComboboxSelectedOptionScroll({
    actualOpen,
    enabled: normalizedInputValue.length === 0,
    isSameItem,
    listRef,
    selectedValue,
    visibleItems,
  });
  useComboboxSearchResultScroll({
    actualOpen,
    listRef,
    normalizedInputValue,
    visibleItems,
  });
  const {
    controlName,
    listboxAriaLabel,
    listboxLabelId,
    shouldRenderFallbackLabel,
    triggerDescribedBy,
    triggerLabelledBy,
  } = useComboboxAccessibility({
    ariaDescribedBy,
    ariaLabel,
    ariaLabelledBy,
    fallbackLabelId,
    formFieldLabelId: formField?.labelId,
    label: effectiveLabel,
    name,
    placeholder,
    showValidation,
    validationMessageId,
    valueId,
  });
  const hoverDetailEnabled =
    hoverDetail?.enabled ??
    Boolean(onFetchHoverDetail || itemToHoverDetailData);
  const {
    cancelPendingHoverDetail,
    data: hoverDetailData,
    handleItemHover,
    handleItemLeave,
    hidePopover: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
    syncHighlightedHoverDetail,
  } = useComboboxHoverDetail({
    boundaryRef: popupContentRef,
    hoverDelay: hoverDetail?.delay ?? 800,
    isComboboxOpen: actualOpen,
    isEnabled: hoverDetailEnabled,
    onFetchData: onFetchHoverDetail,
    onFetchError: onFetchHoverDetailError,
  });
  const clearKeyboardHoverDetailSync = useCallback(() => {
    if (keyboardHoverDetailSyncTimeoutRef.current === null) return;

    clearTimeout(keyboardHoverDetailSyncTimeoutRef.current);
    keyboardHoverDetailSyncTimeoutRef.current = null;
  }, []);
  const clearScrollHoverDetailResume = useCallback(() => {
    if (scrollHoverDetailResumeTimeoutRef.current === null) return;

    clearTimeout(scrollHoverDetailResumeTimeoutRef.current);
    scrollHoverDetailResumeTimeoutRef.current = null;
  }, []);
  const clearListScrollActivityReset = useCallback(() => {
    if (scrollHoverDetailActivityResetTimeoutRef.current === null) return;

    clearTimeout(scrollHoverDetailActivityResetTimeoutRef.current);
    scrollHoverDetailActivityResetTimeoutRef.current = null;
  }, []);
  const resetListScrollActivity = useCallback(() => {
    listScrollActivityRef.current = {
      ...createListScrollActivity(),
      lastTop: listRef.current?.scrollTop ?? 0,
    };
  }, []);
  const scheduleListScrollActivityReset = useCallback(() => {
    clearListScrollActivityReset();
    scrollHoverDetailActivityResetTimeoutRef.current = setTimeout(() => {
      scrollHoverDetailActivityResetTimeoutRef.current = null;
      resetListScrollActivity();
    }, scrollHoverDetailActivityResetDelay);
  }, [clearListScrollActivityReset, resetListScrollActivity]);
  const getOptionElementAtIndex = useCallback((index: number) => {
    if (!Number.isInteger(index) || index < 0) return null;

    return (
      listRef.current?.querySelector<HTMLElement>(
        getPharmaComboboxOptionIndexSelector(index)
      ) ?? null
    );
  }, []);
  const {
    clearKeyboardScrollHighlight,
    heldHighlightFrame,
    heldHighlightFrameKey,
    scheduleKeyboardHighlightedScroll,
  } = useComboboxKeyboardHighlightScroll({
    actualOpen,
    getOptionElementAtIndex,
    listRef,
    popupContentRef,
    visibleItemCount: visibleItems.length,
  });
  const getHighlightedHoverDetailAnchorElement = useCallback(
    (index: number) => {
      const pinnedHighlight = heldHighlightFrame
        ? popupContentRef.current?.querySelector<HTMLElement>(
            '[data-pharma-combobox-pinned-highlight]'
          )
        : null;
      if (pinnedHighlight) return pinnedHighlight;

      const optionElement = getOptionElementAtIndex(index);

      return (
        optionElement?.querySelector<HTMLElement>(
          '[data-pharma-combobox-highlight]'
        ) ?? optionElement
      );
    },
    [getOptionElementAtIndex, heldHighlightFrame]
  );
  const isOptionElementFullyVisible = useCallback((element: HTMLElement) => {
    const list = listRef.current;
    if (!list) return false;

    const listRect = list.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return (
      elementRect.top >= listRect.top && elementRect.bottom <= listRect.bottom
    );
  }, []);

  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const idValue = itemToStringValue(item);
      const nameValue = itemToStringLabel(item);
      const customData = itemToHoverDetailData?.(item);

      return {
        ...getDefaultHoverDetailData(item),
        ...customData,
        id: idValue,
        name: nameValue,
      };
    },
    [itemToHoverDetailData, itemToStringLabel, itemToStringValue]
  );
  const applyPointerHover = useCallback(
    (item: Item, element: HTMLElement) => {
      if (isItemDisabled(item)) return;

      clearKeyboardHoverDetailSync();
      clearKeyboardScrollHighlight();

      if (!hoverDetailEnabled) return;

      handleItemHover(
        itemToStringValue(item),
        element,
        getItemHoverDetailData(item)
      );
    },
    [
      clearKeyboardHoverDetailSync,
      clearKeyboardScrollHighlight,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      isItemDisabled,
      itemToStringValue,
    ]
  );
  const {
    handleListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    isKeyboardHoverSuppressed,
    resetKeyboardHoverSuppression,
    resetPointerHoverState,
    suppressPointerHoverForKeyboard,
  } = useComboboxPointerHover({
    onHoverAllowed: applyPointerHover,
    onLeave: handleItemLeave,
  });
  const handleValueChange = useCallback(
    (nextValue: Item | null, details: PharmaComboboxChangeDetails<Item>) => {
      onValueChange(nextValue, details);
      if (details.isCanceled) return;

      clearKeyboardHoverDetailSync();
      clearListScrollActivityReset();
      resetListScrollActivity();
      clearScrollHoverDetailResume();
      shouldResumeHoverDetailAfterScrollRef.current = false;
      setInputValue('');
      setIsSearchNavigationFocus(false);
      resetKeyboardHoverSuppression();
      hideHoverDetail();
    },
    [
      clearListScrollActivityReset,
      clearKeyboardHoverDetailSync,
      clearScrollHoverDetailResume,
      hideHoverDetail,
      onValueChange,
      resetListScrollActivity,
      resetKeyboardHoverSuppression,
    ]
  );
  const {
    effectiveHighlightedIndex,
    handleHighlightedIndexChange,
    handleInputValueChange,
    handleItemHighlighted,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
  } = useComboboxHighlight({
    actualOpen,
    canCreate,
    clearKeyboardScrollHighlight,
    handleCreate,
    hideHoverDetail,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    isSameItem,
    items,
    normalizedInputValue,
    requestSelectedOptionScroll,
    resetKeyboardHoverSuppression,
    scheduleKeyboardHighlightedScroll,
    searchable,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    suppressPointerHoverForKeyboard,
    visibleItems,
  });
  const syncHoverDetailAfterScroll = useCallback(() => {
    if (!shouldResumeHoverDetailAfterScrollRef.current) return;

    shouldResumeHoverDetailAfterScrollRef.current = false;
    if (!actualOpen || !hoverDetailEnabled) return;
    if (isKeyboardHoverSuppressed()) return;
    if (effectiveHighlightedIndex === null) return;

    const highlightedItem = visibleItems[effectiveHighlightedIndex];
    if (highlightedItem === undefined || isItemDisabled(highlightedItem)) {
      return;
    }

    const optionElement = getOptionElementAtIndex(effectiveHighlightedIndex);
    if (!optionElement || !isOptionElementFullyVisible(optionElement)) return;

    const anchorElement =
      optionElement.querySelector<HTMLElement>(
        '[data-pharma-combobox-highlight]'
      ) ?? optionElement;

    syncHighlightedHoverDetail(
      itemToStringValue(highlightedItem),
      anchorElement,
      getItemHoverDetailData(highlightedItem),
      { show: true }
    );
  }, [
    actualOpen,
    effectiveHighlightedIndex,
    getItemHoverDetailData,
    getOptionElementAtIndex,
    hoverDetailEnabled,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    isOptionElementFullyVisible,
    itemToStringValue,
    syncHighlightedHoverDetail,
    visibleItems,
  ]);
  const resumeHoverDetailAfterScroll = useCallback(() => {
    scrollHoverDetailResumeTimeoutRef.current = null;
    resetListScrollActivity();
    clearListScrollActivityReset();
    syncHoverDetailAfterScroll();
  }, [
    clearListScrollActivityReset,
    resetListScrollActivity,
    syncHoverDetailAfterScroll,
  ]);
  const handleListScroll = useCallback(() => {
    if (!hoverDetailEnabled || isKeyboardHoverSuppressed()) return;

    const list = listRef.current;
    const scrollActivity = listScrollActivityRef.current;
    const now =
      typeof performance === 'undefined' ? Date.now() : performance.now();
    const currentScrollTop = list?.scrollTop ?? 0;
    const scrollDistance = Math.abs(currentScrollTop - scrollActivity.lastTop);
    const isSameScrollBurst =
      scrollActivity.initialized &&
      now - scrollActivity.lastAt <= scrollHoverDetailBurstWindow;
    const accumulatedDistance = isSameScrollBurst
      ? scrollActivity.accumulatedDistance + scrollDistance
      : scrollDistance;
    const isFastScroll =
      scrollActivity.suspended ||
      accumulatedDistance >= scrollHoverDetailFastDistance;
    const wasHoverDetailVisible = isHoverDetailVisibleRef.current;

    listScrollActivityRef.current = {
      accumulatedDistance,
      initialized: true,
      lastAt: now,
      lastTop: currentScrollTop,
      suspended: isFastScroll,
    };

    shouldResumeHoverDetailAfterScrollRef.current =
      shouldResumeHoverDetailAfterScrollRef.current || wasHoverDetailVisible;

    if (!isFastScroll) {
      clearScrollHoverDetailResume();
      syncHoverDetailAfterScroll();
      scheduleListScrollActivityReset();
      return;
    }

    cancelPendingHoverDetail();
    clearKeyboardHoverDetailSync();
    if (wasHoverDetailVisible) {
      isHoverDetailVisibleRef.current = false;
      hideHoverDetail();
    }

    clearListScrollActivityReset();
    clearScrollHoverDetailResume();
    scrollHoverDetailResumeTimeoutRef.current = setTimeout(
      resumeHoverDetailAfterScroll,
      scrollHoverDetailResumeDelay
    );
  }, [
    cancelPendingHoverDetail,
    clearListScrollActivityReset,
    clearKeyboardHoverDetailSync,
    clearScrollHoverDetailResume,
    hideHoverDetail,
    hoverDetailEnabled,
    isKeyboardHoverSuppressed,
    resumeHoverDetailAfterScroll,
    scheduleListScrollActivityReset,
    syncHoverDetailAfterScroll,
  ]);
  const handleOptionListMouseLeave = useCallback(() => {
    shouldResumeHoverDetailAfterScrollRef.current = false;
    clearListScrollActivityReset();
    clearScrollHoverDetailResume();
    resetListScrollActivity();
    handleListMouseLeave();
  }, [
    clearListScrollActivityReset,
    clearScrollHoverDetailResume,
    handleListMouseLeave,
    resetListScrollActivity,
  ]);

  const handleTriggerMouseEnter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

      handleItemHover(
        itemToStringValue(selectedValue),
        event.currentTarget,
        getItemHoverDetailData(selectedValue)
      );
    },
    [
      actualOpen,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      itemToStringValue,
      selectedValue,
    ]
  );

  const handleTriggerMouseLeave = useCallback(() => {
    if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

    handleItemLeave();
  }, [actualOpen, handleItemLeave, hoverDetailEnabled, selectedValue]);

  useEffect(() => {
    if (!actualOpen || !hoverDetailEnabled) return;
    if (!isKeyboardHoverSuppressed()) return;
    if (effectiveHighlightedIndex === null) return;

    const highlightedItem = visibleItems[effectiveHighlightedIndex];
    if (highlightedItem === undefined || isItemDisabled(highlightedItem)) {
      return;
    }

    cancelPendingHoverDetail();
    keyboardHoverDetailSyncTimeoutRef.current = setTimeout(() => {
      keyboardHoverDetailSyncTimeoutRef.current = null;

      const anchorElement = getHighlightedHoverDetailAnchorElement(
        effectiveHighlightedIndex
      );
      if (!anchorElement) return;

      syncHighlightedHoverDetail(
        itemToStringValue(highlightedItem),
        anchorElement,
        getItemHoverDetailData(highlightedItem),
        { show: true }
      );
    }, keyboardHoverDetailSyncDelay);

    return clearKeyboardHoverDetailSync;
  }, [
    actualOpen,
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    effectiveHighlightedIndex,
    getHighlightedHoverDetailAnchorElement,
    getItemHoverDetailData,
    hoverDetailEnabled,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    itemToStringValue,
    syncHighlightedHoverDetail,
    visibleItems,
  ]);

  useEffect(() => clearKeyboardHoverDetailSync, [clearKeyboardHoverDetailSync]);

  useEffect(() => {
    isHoverDetailVisibleRef.current = isHoverDetailVisible;
  }, [isHoverDetailVisible]);

  useEffect(
    () => () => {
      clearListScrollActivityReset();
      clearScrollHoverDetailResume();
    },
    [clearListScrollActivityReset, clearScrollHoverDetailResume]
  );

  useEffect(() => {
    const wasOpen = previousActualOpenRef.current;
    previousActualOpenRef.current = actualOpen;

    if (actualOpen) {
      if (!wasOpen) {
        clearFocusRestoreIntent();
        clearListScrollActivityReset();
        clearKeyboardHoverDetailSync();
        clearScrollHoverDetailResume();
        resetListScrollActivity();
        shouldResumeHoverDetailAfterScrollRef.current = false;
        cancelPendingHoverDetail();
      }
      return;
    }

    setIsSearchNavigationFocus(false);
    clearListScrollActivityReset();
    clearKeyboardHoverDetailSync();
    clearScrollHoverDetailResume();
    resetListScrollActivity();
    shouldResumeHoverDetailAfterScrollRef.current = false;
    hideHoverDetail();
    resetPointerHoverState();

    restoreFocusAfterCloseIfNeeded();
  }, [
    actualOpen,
    cancelPendingHoverDetail,
    clearFocusRestoreIntent,
    clearListScrollActivityReset,
    clearKeyboardHoverDetailSync,
    clearScrollHoverDetailResume,
    hideHoverDetail,
    resetListScrollActivity,
    resetPointerHoverState,
    restoreFocusAfterCloseIfNeeded,
  ]);

  const comboboxRootProps: PharmaComboboxRootBoundaryProps<Item> = {
    items,
    value: selectedValue,
    onValueChange: handleValueChange,
    open: actualOpen,
    onOpenChange: handleOpenChange,
    inputValue,
    onInputValueChange: handleInputValueChange,
    highlightedIndex: effectiveHighlightedIndex,
    onHighlightedIndexChange: handleHighlightedIndexChange,
    onItemHighlighted: handleItemHighlighted,
    itemToStringLabel,
    itemToStringValue,
    isItemDisabled,
    isItemEqualToValue,
    labelId: listboxLabelId,
    name,
    form,
    disabled,
    readOnly,
    required: effectiveRequired,
    filteredItems: visibleItems,
    filter: null,
    autoHighlight: searchable,
  };

  return {
    actualOpen,
    className,
    comboboxRootProps,
    controlName,
    emptyText,
    emptyAction: {
      canCreate,
      label: createActionLabel,
      onCreate: handleCreate,
    },
    fallbackLabelId,
    handleComboboxBlur,
    heldHighlightFrame,
    heldHighlightFrameKey,
    hoverDetail: {
      data: hoverDetailData,
      enabled: hoverDetailEnabled,
      isVisible: isHoverDetailVisible,
      position: hoverDetailPosition,
    },
    optionListProps: {
      effectiveHighlightedIndex,
      hasHeldHighlightFrame: heldHighlightFrame !== null,
      hasVisibleItems,
      indicator,
      inputValue,
      isItemDisabled,
      itemToStringLabel,
      itemToStringValue,
      listRef,
      listboxAriaLabel,
      onItemLeave: handleItemLeave,
      onListMouseLeave: handleOptionListMouseLeave,
      onListScrollIntent: handleListScroll,
      onOptionMouseEnter: handleOptionMouseEnter,
      onOptionMouseMove: handleOptionMouseMove,
      renderOption,
      renderOptionMeta,
      shouldAnimateListItems,
      visibleItems,
      visualHighlightId: `combobox-active-background-${instanceId}`,
    },
    popupClassName,
    popupMatchAnchorWidth,
    popupContentRef,
    rootRef,
    searchable,
    searchHeaderProps: {
      controlName,
      isSearchNavigationFocus,
      normalizedInputValue,
      onNavigationFocusChange: setIsSearchNavigationFocus,
      onSearchInputKeyDown: handleSearchInputKeyDown,
      searchInputRef,
      searchPlaceholder,
    },
    shouldRenderFallbackLabel,
    triggerButtonProps: {
      id: effectiveId,
      ariaLabel,
      ariaLabelledBy: triggerLabelledBy,
      ariaDescribedBy: triggerDescribedBy,
      ariaInvalid: Boolean(showValidation),
      tabIndex,
      onMouseEnter: handleTriggerMouseEnter,
      onMouseLeave: handleTriggerMouseLeave,
      onNavigationKeyDown: handleTriggerKeyDown,
      placeholder,
      selectedLabel,
      setTriggerButtonRef,
      valueId,
    },
    validationState: {
      autoHide: validation?.autoHide,
      autoHideDelay: validation?.autoHideDelay,
      enabled: validation?.enabled,
      messageId: validationMessageId,
      show: showValidation,
    },
  };
}
