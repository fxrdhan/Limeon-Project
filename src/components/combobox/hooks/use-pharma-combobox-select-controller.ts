import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFormFieldContext } from '@/components/form-field/context';
import type { ComboboxRootProps } from '../primitive';
import type {
  PharmaComboboxChangeDetails,
  PharmaComboboxSelectProps,
} from '../presets-types';
import { useComboboxAccessibility } from './use-combobox-accessibility';
import { useComboboxCreateAction } from './use-combobox-create-action';
import { useComboboxDuplicateValueWarning } from './use-combobox-duplicate-value-warning';
import { useComboboxFocusRestore } from './use-combobox-focus-restore';
import { useComboboxOptionInteraction } from './use-combobox-option-interaction';
import { useComboboxSearch } from './use-combobox-search';
import { useComboboxSearchResultScroll } from './use-combobox-search-result-scroll';
import { useComboboxSelectedOptionScroll } from './use-combobox-selected-option-scroll';
import { useComboboxValidation } from './use-combobox-validation';
import { getDefaultItemDisabled } from '../utils/preset-item';
import { getComboboxSelectedValue } from '../utils/preset-state';

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
    formFieldLabelId: formField?.labelId,
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

  useEffect(() => {
    const wasOpen = previousActualOpenRef.current;
    previousActualOpenRef.current = actualOpen;

    if (actualOpen) {
      if (!wasOpen) {
        clearFocusRestoreIntent();
        resetOnOpen();
      }
      return;
    }

    resetOnClose();
    restoreFocusAfterCloseIfNeeded();
  }, [
    actualOpen,
    clearFocusRestoreIntent,
    resetOnClose,
    resetOnOpen,
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
    hoverDetail: hoverDetailState,
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
    popupContainerRef,
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
