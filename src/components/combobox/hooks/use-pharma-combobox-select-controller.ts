import { useCallback } from 'react';
import type {
  PharmaComboboxChangeDetails,
  PharmaComboboxSelectProps,
} from '../presets-types';
import {
  getPharmaComboboxRootProps,
  getPharmaComboboxViewProps,
} from '../utils/preset-controller-props';
import { useComboboxAccessibility } from './use-combobox-accessibility';
import { useComboboxCreateAction } from './use-combobox-create-action';
import { useComboboxDuplicateValueWarning } from './use-combobox-duplicate-value-warning';
import { useComboboxFocusRestore } from './use-combobox-focus-restore';
import { useComboboxOptionInteraction } from './use-combobox-option-interaction';
import { useComboboxSearch } from './use-combobox-search';
import { useComboboxSearchResultScroll } from './use-combobox-search-result-scroll';
import { useComboboxSelectedOptionScroll } from './use-combobox-selected-option-scroll';
import { useComboboxValidation } from './use-combobox-validation';
import { usePharmaComboboxCoreState } from './use-pharma-combobox-core-state';
import { usePharmaComboboxOpenLifecycle } from './use-pharma-combobox-open-lifecycle';
import { getDefaultItemDisabled } from '../utils/preset-item';

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
  popupContainerRef,
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
  const {
    actualOpen,
    effectiveId,
    effectiveLabel,
    effectiveRequired,
    fallbackLabelId,
    formFieldLabelId,
    inputValue,
    instanceId,
    isOpenControlled,
    isSearchNavigationFocus,
    listRef,
    popupContentRef,
    rootRef,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    setUncontrolledOpen,
    valueId,
  } = usePharmaComboboxCoreState({
    id,
    isValueEmpty,
    label,
    open,
    required,
    value,
  });
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
  const isItemDisabled = useCallback(
    (item: Item) => isItemDisabledProp(item),
    [isItemDisabledProp]
  );

  useComboboxDuplicateValueWarning({
    itemToStringValue,
    items,
    name,
  });

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
    formFieldLabelId,
    label: effectiveLabel,
    name,
    placeholder,
    showValidation,
    validationMessageId,
    valueId,
  });
  const {
    effectiveHighlightedIndex,
    handleHighlightedIndexChange,
    handleInputValueChange,
    handleItemHighlighted,
    handleItemLeave,
    handleListScroll,
    handleOptionListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    heldHighlightFrame,
    heldHighlightFrameKey,
    hoverDetail: hoverDetailState,
    resetAfterValueChange,
    resetOnClose,
    resetOnOpen,
  } = useComboboxOptionInteraction({
    actualOpen,
    canCreate,
    handleCreate,
    hoverDetail,
    isItemDisabled,
    isSameItem,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    items,
    listRef,
    normalizedInputValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    popupContentRef,
    requestSelectedOptionScroll,
    searchable,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    visibleItems,
  });

  const handleValueChange = useCallback(
    (nextValue: Item | null, details: PharmaComboboxChangeDetails<Item>) => {
      onValueChange(nextValue, details);
      if (details.isCanceled) return;

      resetAfterValueChange();
    },
    [onValueChange, resetAfterValueChange]
  );

  usePharmaComboboxOpenLifecycle({
    actualOpen,
    clearFocusRestoreIntent,
    resetOnClose,
    resetOnOpen,
    restoreFocusAfterCloseIfNeeded,
  });

  const comboboxRootProps = getPharmaComboboxRootProps({
    actualOpen,
    disabled,
    effectiveHighlightedIndex,
    effectiveRequired,
    form,
    handleHighlightedIndexChange,
    handleInputValueChange,
    handleItemHighlighted,
    handleOpenChange,
    handleValueChange,
    inputValue,
    isItemDisabled,
    isItemEqualToValue,
    itemToStringLabel,
    itemToStringValue,
    items,
    listboxLabelId,
    name,
    readOnly,
    searchable,
    selectedValue,
    visibleItems,
  });
  const {
    emptyAction,
    optionListProps,
    searchHeaderProps,
    triggerButtonProps,
    validationState,
  } = getPharmaComboboxViewProps({
    ariaLabel,
    canCreate,
    controlName,
    createActionLabel,
    effectiveHighlightedIndex,
    effectiveId,
    handleCreate,
    handleItemLeave,
    handleListScroll,
    handleOptionListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    hasHeldHighlightFrame: heldHighlightFrame !== null,
    hasVisibleItems,
    indicator,
    inputValue,
    isItemDisabled,
    isSearchNavigationFocus,
    itemToStringLabel,
    itemToStringValue,
    listRef,
    listboxAriaLabel,
    normalizedInputValue,
    placeholder,
    renderOption,
    renderOptionMeta,
    searchInputRef,
    searchPlaceholder,
    selectedValue,
    setIsSearchNavigationFocus,
    setTriggerButtonRef,
    showValidation,
    tabIndex,
    triggerDescribedBy,
    triggerLabelledBy,
    validation,
    validationMessageId,
    valueId,
    visibleItems,
    visualHighlightId: `combobox-active-background-${instanceId}`,
  });

  return {
    actualOpen,
    className,
    comboboxRootProps,
    controlName,
    emptyText,
    emptyAction,
    fallbackLabelId,
    handleComboboxBlur,
    heldHighlightFrame,
    heldHighlightFrameKey,
    hoverDetail: hoverDetailState,
    optionListProps,
    popupClassName,
    popupContainerRef,
    popupMatchAnchorWidth,
    popupContentRef,
    rootRef,
    searchable,
    searchHeaderProps,
    shouldRenderFallbackLabel,
    triggerButtonProps,
    validationState,
  };
}
