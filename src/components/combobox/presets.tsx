import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'motion/react';
import { useFormFieldContext } from '@/components/form-field/context';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import { comboboxHighlightBackgroundTransition } from './components/combobox-highlight-motion';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { ComboboxOptionList } from './components/combobox-option-list';
import { ComboboxSearchHeader } from './components/combobox-search-header';
import type { ComboboxIndicatorKind } from './components/combobox-selection-indicator';
import { ComboboxTriggerButton } from './components/combobox-trigger-button';
import { Combobox, type ComboboxRootProps } from './primitive';
import { useComboboxAccessibility } from './hooks/use-combobox-accessibility';
import {
  useComboboxCreateAction,
  type ComboboxCreateAction,
} from './hooks/use-combobox-create-action';
import { useComboboxFocusRestore } from './hooks/use-combobox-focus-restore';
import { useComboboxKeyboardHighlightScroll } from './hooks/use-combobox-keyboard-highlight-scroll';
import { useComboboxPointerHover } from './hooks/use-combobox-pointer-hover';
import { useComboboxSearch } from './hooks/use-combobox-search';
import { useComboboxSelectedOptionScroll } from './hooks/use-combobox-selected-option-scroll';
import {
  comboboxRequiredValidationMessage,
  useComboboxValidation,
} from './hooks/use-combobox-validation';
import { useComboboxHighlight } from './hooks/use-combobox-highlight';
import {
  getComboboxSelectedValue,
  type ComboboxValueIsEmpty,
} from './utils/preset-state';
import { useComboboxHoverDetail } from './hooks/use-combobox-hover-detail';
import {
  getDefaultHoverDetailData,
  getDefaultItemDisabled,
} from './utils/preset-item';

export type PharmaComboboxChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onValueChange']>
>[1];
export type PharmaComboboxOpenChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onOpenChange']>
>[1];

export interface PharmaComboboxOptionRenderState {
  disabled: boolean;
  highlighted: boolean;
  inputValue: string;
  label: string;
  selected: boolean;
}

export interface PharmaComboboxSelectProps<Item> {
  id?: string;
  label?: string;
  name?: string;
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
  renderOption?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
  renderOptionMeta?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
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
  createAction?: ComboboxCreateAction;
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
  renderOption,
  renderOptionMeta,
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Cari...',
  emptyText = 'Tidak ada data',
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
  const { hasExactItem, hasVisibleItems, normalizedInputValue, visibleItems } =
    useComboboxSearch({
      inputValue,
      itemToStringLabel,
      items,
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
        `[data-pharma-combobox-index="${index}"]`
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

  return (
    <div ref={rootRef} className={className} onBlur={handleComboboxBlur}>
      {shouldRenderFallbackLabel ? (
        <span id={fallbackLabelId} className="sr-only">
          {controlName}
        </span>
      ) : null}
      <Combobox.Root<Item>
        items={items}
        value={selectedValue}
        onValueChange={handleValueChange}
        open={actualOpen}
        onOpenChange={handleOpenChange}
        inputValue={inputValue}
        onInputValueChange={handleInputValueChange}
        highlightedIndex={effectiveHighlightedIndex}
        onHighlightedIndexChange={handleHighlightedIndexChange}
        onItemHighlighted={handleItemHighlighted}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={itemToStringValue}
        isItemDisabled={isItemDisabled}
        isItemEqualToValue={isItemEqualToValue}
        labelId={listboxLabelId}
        name={name}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        required={effectiveRequired}
        filteredItems={visibleItems}
        filter={null}
        autoHighlight={searchable}
      >
        <ComboboxTriggerButton
          id={effectiveId}
          ariaLabel={ariaLabel}
          ariaLabelledBy={triggerLabelledBy}
          ariaDescribedBy={triggerDescribedBy}
          ariaInvalid={Boolean(showValidation)}
          tabIndex={tabIndex}
          onNavigationKeyDown={handleTriggerKeyDown}
          placeholder={placeholder}
          selectedLabel={selectedLabel}
          setTriggerButtonRef={setTriggerButtonRef}
          valueId={valueId}
        />
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={4}
            matchAnchorWidth={popupClassName === undefined}
            className="z-[1000] w-[var(--anchor-width)]"
          >
            <Combobox.Popup
              initialFocus={false}
              className={cn(
                'max-w-[var(--available-width)]',
                popupClassName ??
                  'w-full overflow-hidden rounded-xl bg-white shadow-thin-md'
              )}
            >
              <div
                ref={popupContentRef}
                className="relative flex max-h-[var(--available-height)] flex-col overflow-hidden"
                onBlur={handleComboboxBlur}
              >
                {heldHighlightFrame ? (
                  <motion.div
                    key={heldHighlightFrameKey}
                    aria-hidden="true"
                    data-pharma-combobox-pinned-highlight=""
                    className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                    style={heldHighlightFrame}
                    initial={false}
                    animate={heldHighlightFrame}
                    transition={comboboxHighlightBackgroundTransition}
                  />
                ) : null}
                {searchable ? (
                  <ComboboxSearchHeader
                    canCreate={canCreate}
                    controlName={controlName}
                    createActionLabel={createActionLabel}
                    isSearchNavigationFocus={isSearchNavigationFocus}
                    normalizedInputValue={normalizedInputValue}
                    onCreate={handleCreate}
                    onNavigationFocusChange={setIsSearchNavigationFocus}
                    onSearchInputKeyDown={handleSearchInputKeyDown}
                    searchInputRef={searchInputRef}
                    searchPlaceholder={searchPlaceholder}
                  />
                ) : null}
                <ComboboxOptionList
                  effectiveHighlightedIndex={effectiveHighlightedIndex}
                  hasHeldHighlightFrame={heldHighlightFrame !== null}
                  hasVisibleItems={hasVisibleItems}
                  indicator={indicator}
                  inputValue={inputValue}
                  isItemDisabled={isItemDisabled}
                  itemToStringLabel={itemToStringLabel}
                  itemToStringValue={itemToStringValue}
                  listRef={listRef}
                  listboxAriaLabel={listboxAriaLabel}
                  onItemLeave={handleItemLeave}
                  onListMouseLeave={handleListMouseLeave}
                  onOptionMouseEnter={handleOptionMouseEnter}
                  onOptionMouseMove={handleOptionMouseMove}
                  renderOption={renderOption}
                  renderOptionMeta={renderOptionMeta}
                  shouldAnimateListItems={shouldAnimateListItems}
                  visibleItems={visibleItems}
                  visualHighlightId={`combobox-active-background-${instanceId}`}
                />
                <Combobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                  {emptyText}
                </Combobox.Empty>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {validation?.enabled ? (
        <span id={validationMessageId} className="sr-only">
          {showValidation ? comboboxRequiredValidationMessage : ''}
        </span>
      ) : null}
      {validation?.enabled ? (
        <ValidationOverlay
          error={comboboxRequiredValidationMessage}
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
