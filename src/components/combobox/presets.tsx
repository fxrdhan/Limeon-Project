import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'motion/react';
import { TbChevronDown, TbPlus, TbSearch } from 'react-icons/tb';
import { useFormFieldContext } from '@/components/form-field/context';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { ComboboxOptionMotionFrame } from './components/combobox-option-motion-frame';
import {
  ComboboxSelectionIndicator,
  type ComboboxIndicatorKind,
} from './components/combobox-selection-indicator';
import { Combobox, type ComboboxRootProps } from './primitive';
import {
  getComboboxControlName,
  getComboboxSelectedValue,
  getVisibleComboboxItems,
  hasExactComboboxItem,
  type ComboboxValueIsEmpty,
} from './utils/preset-state';
import { useComboboxHoverDetail } from './hooks/use-combobox-hover-detail';

export type PharmaComboboxChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onValueChange']>
>[1];
export type PharmaComboboxOpenChangeDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onOpenChange']>
>[1];
type PharmaComboboxHighlightDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onItemHighlighted']>
>[1];

type BaseUIPreventableSyntheticEvent = React.SyntheticEvent & {
  preventBaseUIHandler?: () => void;
};

type ComboboxItemRecord = Partial<HoverDetailData> & {
  disabled?: boolean;
};

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
  const blurValidationFrameRef = useRef<number | null>(null);
  const fallbackLabelId = useId();
  const valueId = useId();
  const validationMessageId = useId();
  const [inputValue, setInputValue] = useState('');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [visualBackgroundValue, setVisualBackgroundValue] =
    useState<Item | null>(null);

  const actualOpen = open ?? uncontrolledOpen;
  const isOpenControlled = open !== undefined;
  const effectiveId = id ?? formField?.controlId;
  const effectiveLabel = label ?? formField?.label;
  const effectiveRequired = required || Boolean(formField?.required);
  const selectedValue = useMemo(
    () => getComboboxSelectedValue(value, isValueEmpty),
    [isValueEmpty, value]
  );
  const showValidation =
    validation?.enabled &&
    effectiveRequired &&
    blurred &&
    selectedValue == null;
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
    createAction && normalizedInputValue.length > 0 && !hasExactItem
  );
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
  const controlName = getComboboxControlName({
    label: effectiveLabel,
    name,
    placeholder,
  });
  const shouldRenderFallbackLabel =
    !ariaLabelledBy && !ariaLabel && !formField?.labelId;
  const triggerLabelledBy = ariaLabelledBy
    ? `${ariaLabelledBy} ${valueId}`
    : ariaLabel
      ? undefined
      : `${formField?.labelId ?? fallbackLabelId} ${valueId}`;
  const triggerDescribedBy =
    [ariaDescribedBy, showValidation ? validationMessageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
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
  const handleCreate = useCallback(() => {
    if (!canCreate) return;

    createAction?.onCreate(normalizedInputValue);
  }, [canCreate, createAction, normalizedInputValue]);
  const handleOpenChange = useCallback(
    (nextOpen: boolean, details: PharmaComboboxOpenChangeDetails<Item>) => {
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return;

      if (!isOpenControlled) setUncontrolledOpen(nextOpen);
    },
    [isOpenControlled, onOpenChange]
  );
  const handleValueChange = useCallback(
    (nextValue: Item | null, details: PharmaComboboxChangeDetails<Item>) => {
      onValueChange(nextValue, details);
      if (details.isCanceled) return;

      setInputValue('');
      hideHoverDetail();
    },
    [hideHoverDetail, onValueChange]
  );
  const handleInputValueChange = useCallback(
    (nextValue: string) => {
      setInputValue(nextValue);
      hideHoverDetail();
    },
    [hideHoverDetail]
  );
  const handleItemHighlighted = useCallback(
    (
      nextHighlighted: Item | undefined,
      details: PharmaComboboxHighlightDetails<Item>
    ) => {
      if (nextHighlighted === undefined) {
        if (details.reason === 'pointer') return;

        setVisualBackgroundValue(
          selectedValue &&
            visibleItems.some(item => isSameItem(item, selectedValue))
            ? selectedValue
            : firstHighlightableVisibleItem
        );
        return;
      }

      setVisualBackgroundValue(nextHighlighted);
    },
    [firstHighlightableVisibleItem, isSameItem, selectedValue, visibleItems]
  );
  const handleSearchInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || !canCreate) return;

      event.preventDefault();
      event.stopPropagation();
      preventBaseUIHandler(event);
      handleCreate();
    },
    [canCreate, handleCreate]
  );
  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!searchable || !actualOpen) return;
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
      hideHoverDetail();
      searchInputRef.current?.focus({ preventScroll: true });
    },
    [actualOpen, hideHoverDetail, searchable]
  );
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

  useLayoutEffect(() => {
    if (!actualOpen) setInputValue('');
  }, [actualOpen]);

  useEffect(() => {
    if (actualOpen) return;

    hideHoverDetail();
    setVisualBackgroundValue(null);
  }, [actualOpen, hideHoverDetail]);

  useEffect(() => {
    if (!actualOpen) return;

    if (
      visualBackgroundValue != null &&
      visibleItems.some(
        item => isSameItem(item, visualBackgroundValue) && !isItemDisabled(item)
      )
    ) {
      return;
    }

    const nextVisualBackgroundValue =
      selectedValue &&
      visibleItems.some(
        item => isSameItem(item, selectedValue) && !isItemDisabled(item)
      )
        ? selectedValue
        : firstHighlightableVisibleItem;

    setVisualBackgroundValue(nextVisualBackgroundValue);
  }, [
    actualOpen,
    firstHighlightableVisibleItem,
    isItemDisabled,
    isSameItem,
    selectedValue,
    visibleItems,
    visualBackgroundValue,
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

  useEffect(
    () => () => {
      if (blurValidationFrameRef.current !== null) {
        window.cancelAnimationFrame(blurValidationFrameRef.current);
      }
    },
    []
  );

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
        onItemHighlighted={handleItemHighlighted}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={itemToStringValue}
        isItemEqualToValue={isItemEqualToValue}
        name={name}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        required={effectiveRequired}
        filteredItems={visibleItems}
        filter={null}
        autoHighlight={searchable}
      >
        <Combobox.Trigger
          id={effectiveId}
          aria-label={ariaLabel}
          aria-labelledby={triggerLabelledBy}
          aria-describedby={triggerDescribedBy}
          aria-invalid={showValidation || undefined}
          tabIndex={tabIndex}
          render={(props, state) => {
            const { ref, onKeyDown, ...triggerProps } = props;

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

                  onKeyDown?.(event);
                }}
                className={cn(
                  'flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm transition focus:border-primary focus:outline-hidden focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100',
                  showValidation
                    ? 'border-red-400'
                    : state.open
                      ? 'border-primary'
                      : 'border-slate-300'
                )}
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
                  className={cn(
                    'h-4 w-4 shrink-0 text-slate-500 transition-transform',
                    state.open && 'rotate-180'
                  )}
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
                        placeholder={searchPlaceholder}
                        onKeyDown={handleSearchInputKeyDown}
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
                >
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
                          if (isItemDisabled(item)) return;

                          setVisualBackgroundValue(item);

                          if (!hoverDetailEnabled) return;

                          handleItemHover(
                            itemToStringValue(item),
                            event.currentTarget,
                            getItemHoverDetailData(item)
                          );
                        }}
                        onMouseLeave={handleItemLeave}
                        render={(props, state) => {
                          const { ref, ...itemProps } = props;
                          const labelText = itemToStringLabel(item);
                          const isVisuallyHighlighted =
                            state.highlighted ||
                            (visualBackgroundValue != null &&
                              isSameItem(item, visualBackgroundValue));
                          const renderState: PharmaComboboxOptionRenderState = {
                            disabled: state.disabled,
                            highlighted: isVisuallyHighlighted,
                            inputValue,
                            label: labelText,
                            selected: state.selected,
                          };
                          const optionMeta = renderOptionMeta?.(
                            item,
                            renderState
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
                                state.selected && 'font-semibold text-primary',
                                state.disabled &&
                                  'cursor-not-allowed opacity-50'
                              )}
                            >
                              {isVisuallyHighlighted ? (
                                <motion.div
                                  key={`combobox-active-background-${instanceId}-${inputValue}`}
                                  layoutId={`combobox-active-background-${instanceId}-${inputValue}`}
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
                                {renderOption ? (
                                  <span className="min-w-0 flex-1">
                                    {renderOption(item, renderState)}
                                  </span>
                                ) : (
                                  <span className="min-w-0 flex-1 truncate">
                                    {labelText}
                                  </span>
                                )}
                                {optionMeta ? (
                                  <span className="shrink-0 text-xs font-normal text-slate-500">
                                    {optionMeta}
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          );
                        }}
                      />
                    </ComboboxOptionMotionFrame>
                  ))}
                </Combobox.List>
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
