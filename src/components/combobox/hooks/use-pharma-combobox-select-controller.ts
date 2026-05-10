import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
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
import { useComboboxSelectedOptionScroll } from './use-combobox-selected-option-scroll';
import { useComboboxValidation } from './use-combobox-validation';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';
import {
  getDefaultHoverDetailData,
  getDefaultItemDisabled,
} from '../utils/preset-item';
import { getComboboxSelectedValue } from '../utils/preset-state';

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
  const fallbackLabelId = useId();
  const valueId = useId();
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
  const { requestSelectedOptionScroll } = useComboboxSelectedOptionScroll({
    actualOpen,
    isSameItem,
    listRef,
    selectedValue,
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

      clearKeyboardScrollHighlight();

      if (!hoverDetailEnabled) return;

      handleItemHover(
        itemToStringValue(item),
        element,
        getItemHoverDetailData(item)
      );
    },
    [
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

      setInputValue('');
      setIsSearchNavigationFocus(false);
      resetKeyboardHoverSuppression();
      hideHoverDetail();
    },
    [hideHoverDetail, onValueChange, resetKeyboardHoverSuppression]
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

  useEffect(() => {
    const wasOpen = previousActualOpenRef.current;
    previousActualOpenRef.current = actualOpen;

    if (actualOpen) {
      if (!wasOpen) clearFocusRestoreIntent();
      return;
    }

    setIsSearchNavigationFocus(false);
    hideHoverDetail();
    resetPointerHoverState();

    restoreFocusAfterCloseIfNeeded();
  }, [
    actualOpen,
    clearFocusRestoreIntent,
    hideHoverDetail,
    resetPointerHoverState,
    restoreFocusAfterCloseIfNeeded,
  ]);

  const comboboxRootProps = {
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
  } satisfies Omit<ComboboxRootProps<Item>, 'children'>;

  return {
    actualOpen,
    className,
    comboboxRootProps,
    controlName,
    emptyText,
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
      onListMouseLeave: handleListMouseLeave,
      onOptionMouseEnter: handleOptionMouseEnter,
      onOptionMouseMove: handleOptionMouseMove,
      renderOption,
      renderOptionMeta,
      shouldAnimateListItems,
      visibleItems,
      visualHighlightId: `combobox-active-background-${instanceId}`,
    },
    popupClassName,
    popupContentRef,
    rootRef,
    searchable,
    searchHeaderProps: {
      canCreate,
      controlName,
      createActionLabel,
      isSearchNavigationFocus,
      normalizedInputValue,
      onCreate: handleCreate,
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
