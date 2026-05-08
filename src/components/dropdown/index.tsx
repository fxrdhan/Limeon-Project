import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { TbChevronDown, TbPlus, TbSearch } from 'react-icons/tb';
import type {
  CheckboxDropdownProps,
  DropdownOption,
  DropdownProps,
} from '@/types';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import {
  FORM_CONTROL_BORDER_DEFAULT_CLASS,
  FORM_CONTROL_BORDER_ERROR_CLASS,
  FORM_CONTROL_FOCUS_CLASS,
  FORM_CONTROL_FOCUS_ERROR_CLASS,
} from '@/styles/uiPrimitives';
import { DROPDOWN_CONSTANTS, SEARCH_STATES } from './constants';
import BaseDropdownItem from './components/base-dropdown-item';
import BaseHoverDetailPopover from './components/base-hover-detail-popover';
import { useBaseHoverDetail } from './hooks/use-base-hover-detail';
import { useComboboxValidationState } from './hooks/use-combobox-validation-state';
import { useDebouncedValue } from './hooks/use-debounced-value';
import { useVirtualOptions } from './hooks/use-virtual-options';
import { filterAndSortOptions } from './utils/dropdownUtils';
import {
  getPopupAlign,
  getPopupSide,
  getPopupWidth,
} from './utils/base-dropdown-layout';
import { getSearchState } from './utils/search-state';

let activeDropdownClose: (() => void) | null = null;
let activeDropdownId: string | null = null;

const isCheckboxProps = (
  props: DropdownProps | CheckboxDropdownProps
): props is CheckboxDropdownProps =>
  'withCheckbox' in props && props.withCheckbox === true;

const isPrintableSearchKey = (event: React.KeyboardEvent) =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

const getOptionName = (optionsById: Map<string, DropdownOption>, id: string) =>
  optionsById.get(id)?.name ?? id;

function Dropdown(props: DropdownProps): React.JSX.Element;
function Dropdown(props: CheckboxDropdownProps): React.JSX.Element;
function Dropdown(allProps: DropdownProps | CheckboxDropdownProps) {
  const {
    align = 'right',
    autoScrollOnOpen = true,
    disabled = false,
    enableHoverDetail = false,
    freezePersistedMenu = false,
    hoverDetailDelay = 800,
    hoverToOpen = false,
    mode = 'input',
    name,
    onAddNew,
    onFetchHoverDetail,
    onPersistOpenClear,
    options,
    persistOpen = false,
    placeholder = '-- Pilih --',
    portalWidth = 'auto',
    position = 'auto',
    required = false,
    searchList = true,
    showValidationOnBlur = true,
    tabIndex,
    validate = false,
    validationAutoHide = true,
    validationAutoHideDelay,
  } = allProps;
  const withCheckbox = isCheckboxProps(allProps);
  const withRadio =
    'withRadio' in allProps ? allProps.withRadio === true : false;
  const value = allProps.value;
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverDetailScrollIdleTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hasAutoScrolledOnOpenRef = useRef(false);
  const wasHighlightOpenRef = useRef(false);
  const [highlightOpenCycle, setHighlightOpenCycle] = useState(0);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [baseHighlightedId, setBaseHighlightedId] = useState<
    string | undefined
  >();
  const baseHighlightedIdRef = useRef<string | undefined>(undefined);
  const [visualHighlightedId, setVisualHighlightedId] = useState<
    string | undefined
  >();
  const visualHighlightedIdRef = useRef<string | undefined>(undefined);
  const effectiveOpen = open || persistOpen || pinnedOpen;
  const isFrozen = freezePersistedMenu && effectiveOpen;
  const optionsById = useMemo(
    () => new Map(options.map(option => [option.id, option])),
    [options]
  );
  const optionIds = useMemo(() => options.map(option => option.id), [options]);
  const debouncedSearchTerm = useDebouncedValue(
    searchTerm,
    DROPDOWN_CONSTANTS.DEBOUNCE_DELAY
  );
  const selectedOption =
    typeof value === 'string' ? optionsById.get(value) : undefined;
  const selectedIds = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value]
  );
  const selectedPrimaryId = selectedIds[0] ?? '';
  const selectedOptions = selectedIds
    .map(id => optionsById.get(id))
    .filter((option): option is DropdownOption => Boolean(option));
  const filteredOptions = useMemo(
    () =>
      searchList && debouncedSearchTerm.trim()
        ? filterAndSortOptions(options, debouncedSearchTerm)
        : options,
    [debouncedSearchTerm, options, searchList]
  );
  const filteredIds = useMemo(
    () => filteredOptions.map(option => option.id),
    [filteredOptions]
  );
  const searchState = getSearchState(
    searchTerm,
    debouncedSearchTerm,
    filteredOptions
  );
  const activeBackgroundLayoutId = `dropdown-active-background-${instanceId}-${highlightOpenCycle}-${searchTerm}-${filteredOptions[0]?.id ?? 'empty'}`;
  const {
    data: hoverDetailData,
    handleOptionHover,
    handleOptionLeave,
    hidePortal: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
    suppressPortal: suppressHoverDetail,
  } = useBaseHoverDetail({
    hoverDelay: hoverDetailDelay,
    isDropdownOpen: effectiveOpen && !isFrozen,
    isEnabled: enableHoverDetail,
    onFetchData: onFetchHoverDetail,
  });
  const {
    handleScroll,
    itemHeight,
    shouldVirtualize,
    syncScrollTop,
    totalSize,
    virtualItems,
  } = useVirtualOptions(filteredOptions, listRef);
  const {
    closeValidation,
    errorMessage,
    handleAutoHide,
    hasAutoHidden,
    hasError,
    markTouched,
    showValidationOverlay,
  } = useComboboxValidationState({
    required,
    validate,
    value,
    showValidationOnBlur,
  });
  const collisionAvoidance = useMemo(
    () => ({
      side: position === 'auto' ? ('flip' as const) : ('shift' as const),
      align: 'shift' as const,
      fallbackAxisSide:
        position === 'auto' ? ('end' as const) : ('none' as const),
    }),
    [position]
  );
  const setListRef = useCallback((element: HTMLDivElement | null) => {
    listRef.current = element;
    setListElement(element);
  }, []);

  const setBaseHighlightedOption = useCallback(
    (optionId: string | undefined) => {
      if (baseHighlightedIdRef.current === optionId) return;
      baseHighlightedIdRef.current = optionId;
      setBaseHighlightedId(optionId);
    },
    []
  );

  const setVisualHighlightedOption = useCallback(
    (optionId: string | undefined) => {
      if (visualHighlightedIdRef.current === optionId) return;
      visualHighlightedIdRef.current = optionId;
      setVisualHighlightedId(optionId);
    },
    []
  );

  const setProgrammaticHighlightedOption = useCallback(
    (optionId: string | undefined) => {
      setBaseHighlightedOption(optionId);
      setVisualHighlightedOption(optionId);
    },
    [setBaseHighlightedOption, setVisualHighlightedOption]
  );

  const handleBaseItemHighlighted = useCallback(
    (
      optionId: string | undefined,
      details: Combobox.Root.HighlightEventDetails
    ) => {
      setBaseHighlightedOption(optionId);

      if (optionId !== undefined) {
        setVisualHighlightedOption(optionId);
      }

      if (details.reason === 'keyboard') {
        setIsKeyboardNavigation(true);
      } else if (details.reason === 'pointer') {
        setIsKeyboardNavigation(false);
      }
    },
    [setBaseHighlightedOption, setVisualHighlightedOption]
  );

  useEffect(() => {
    if (effectiveOpen && !wasHighlightOpenRef.current) {
      setHighlightOpenCycle(previousCycle => previousCycle + 1);
    }
    wasHighlightOpenRef.current = effectiveOpen;
  }, [effectiveOpen]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setPinnedOpen(false);
    setSearchTerm('');
    onPersistOpenClear?.();
  }, [onPersistOpenClear]);

  useEffect(() => {
    if (!effectiveOpen || activeDropdownId === instanceId) return;

    activeDropdownClose?.();
    activeDropdownId = instanceId;
    activeDropdownClose = closeDropdown;

    return () => {
      if (activeDropdownId === instanceId) {
        activeDropdownId = null;
        activeDropdownClose = null;
      }
    };
  }, [closeDropdown, effectiveOpen, instanceId]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (hoverDetailScrollIdleTimeoutRef.current) {
        clearTimeout(hoverDetailScrollIdleTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!effectiveOpen) {
      hasAutoScrolledOnOpenRef.current = false;
      return;
    }

    if (
      hasAutoScrolledOnOpenRef.current ||
      !autoScrollOnOpen ||
      !selectedPrimaryId
    ) {
      return;
    }

    const selectedIndex = filteredOptions.findIndex(
      option => option.id === selectedPrimaryId
    );
    if (selectedIndex < 0) return;

    const container = listElement;
    if (!container) return;

    hasAutoScrolledOnOpenRef.current = true;
    const nextScrollTop = selectedIndex * itemHeight;
    container.scrollTop = nextScrollTop;
    syncScrollTop(nextScrollTop);
  }, [
    autoScrollOnOpen,
    effectiveOpen,
    filteredOptions,
    itemHeight,
    listElement,
    selectedPrimaryId,
    syncScrollTop,
  ]);

  useEffect(() => {
    if (!effectiveOpen) {
      setProgrammaticHighlightedOption(undefined);
      setIsKeyboardNavigation(false);
      return;
    }

    if (filteredOptions.length === 0) {
      setProgrammaticHighlightedOption(undefined);
      return;
    }

    if (
      visualHighlightedIdRef.current &&
      filteredOptions.some(
        option => option.id === visualHighlightedIdRef.current
      )
    ) {
      return;
    }

    const selectedOptionId = selectedPrimaryId
      ? filteredOptions.find(option => option.id === selectedPrimaryId)?.id
      : undefined;
    setProgrammaticHighlightedOption(selectedOptionId ?? filteredOptions[0].id);
  }, [
    effectiveOpen,
    filteredOptions,
    selectedPrimaryId,
    setProgrammaticHighlightedOption,
  ]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean, details?: Combobox.Root.ChangeEventDetails) => {
      if (disabled) return;

      if (!nextOpen && isFrozen) {
        details?.cancel();
        return;
      }

      if (!nextOpen && (persistOpen || pinnedOpen)) {
        onPersistOpenClear?.();
        setPinnedOpen(false);
      }

      if (nextOpen) {
        if (activeDropdownId !== instanceId) {
          activeDropdownClose?.();
        }
        activeDropdownId = instanceId;
        activeDropdownClose = closeDropdown;
      }

      setOpen(nextOpen);
      if (!nextOpen) {
        setSearchTerm('');
        hideHoverDetail();
      }
    },
    [
      closeDropdown,
      disabled,
      hideHoverDetail,
      instanceId,
      isFrozen,
      onPersistOpenClear,
      persistOpen,
      pinnedOpen,
    ]
  );

  const handleValueChange = useCallback(
    (nextValue: string | string[] | null) => {
      if (withCheckbox && isCheckboxProps(allProps)) {
        allProps.onChange(Array.isArray(nextValue) ? nextValue : []);
        closeValidation();
        setOpen(true);
        return;
      }

      const selectedValue =
        typeof nextValue === 'string' ? nextValue : (nextValue?.[0] ?? '');
      (allProps as DropdownProps).onChange(selectedValue);
      closeValidation();
      setSearchTerm('');
      setPinnedOpen(false);
      onPersistOpenClear?.();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    },
    [allProps, closeValidation, onPersistOpenClear, withCheckbox]
  );

  const handleAddNew = useCallback(() => {
    if (!onAddNew) return;
    setPinnedOpen(true);
    setOpen(true);
    inputRef.current?.blur();
    onAddNew(searchTerm);
  }, [onAddNew, searchTerm]);

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        effectiveOpen &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault();
        if (filteredOptions.length === 0) return;

        const currentId =
          baseHighlightedIdRef.current ??
          visualHighlightedIdRef.current ??
          selectedIds[0];
        const currentIndex = filteredOptions.findIndex(
          option => option.id === currentId
        );
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex =
          currentIndex < 0
            ? direction > 0
              ? 0
              : filteredOptions.length - 1
            : (currentIndex + direction + filteredOptions.length) %
              filteredOptions.length;
        const nextHighlightedId = filteredOptions[nextIndex]?.id;

        setIsKeyboardNavigation(true);
        setProgrammaticHighlightedOption(nextHighlightedId);
        return;
      }

      const activeHighlightedId =
        baseHighlightedIdRef.current ?? visualHighlightedId;
      if (effectiveOpen && event.key === 'Enter' && activeHighlightedId) {
        event.preventDefault();
        if (withCheckbox) {
          const nextValue = selectedIds.includes(activeHighlightedId)
            ? selectedIds.filter(id => id !== activeHighlightedId)
            : [...selectedIds, activeHighlightedId];
          handleValueChange(nextValue);
        } else {
          handleValueChange(activeHighlightedId);
        }
        return;
      }

      if (
        effectiveOpen &&
        searchList &&
        isPrintableSearchKey(event) &&
        document.activeElement === triggerRef.current
      ) {
        event.preventDefault();
        if (enableHoverDetail) {
          hideHoverDetail();
        }
        setSearchTerm(previous => `${previous}${event.key}`);
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          inputRef.current.value.length,
          inputRef.current.value.length
        );
        window.requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(
            inputRef.current.value.length,
            inputRef.current.value.length
          );
        });
      }
    },
    [
      effectiveOpen,
      enableHoverDetail,
      filteredOptions,
      handleValueChange,
      hideHoverDetail,
      searchList,
      selectedIds,
      setProgrammaticHighlightedOption,
      visualHighlightedId,
      withCheckbox,
    ]
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        event.key === 'Enter' &&
        onAddNew &&
        searchTerm.trim() &&
        filteredOptions.length === 0
      ) {
        event.preventDefault();
        handleAddNew();
      }
    },
    [filteredOptions.length, handleAddNew, onAddNew, searchTerm]
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (
        rootRef.current?.contains(activeElement) ||
        listRef.current?.contains(activeElement)
      ) {
        return;
      }
      markTouched();
    }, 0);
  }, [markTouched]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (hoverToOpen && !disabled) {
      setOpen(true);
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [disabled, hoverToOpen]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!hoverToOpen || persistOpen || pinnedOpen) return;

    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      setSearchTerm('');
    }, DROPDOWN_CONSTANTS.HOVER_TIMEOUT);
  }, [hoverToOpen, persistOpen, pinnedOpen]);

  const showHoverDetail = useCallback(
    (
      option: DropdownOption,
      element: HTMLElement,
      hoverOptions: { immediate?: boolean } = {}
    ) => {
      handleOptionHover(
        option.id,
        element,
        {
          id: option.id,
          name: option.name,
          code: option.code,
          description: option.description,
          metaLabel: option.metaLabel,
          metaTone: option.metaTone,
          updated_at: option.updated_at,
        },
        hoverOptions
      );
    },
    [handleOptionHover]
  );

  const handlePointerHighlightPreview = useCallback(
    (optionId: string) => {
      setIsKeyboardNavigation(false);
      setVisualHighlightedOption(optionId);
    },
    [setVisualHighlightedOption]
  );

  const handleInputValueChange = useCallback(
    (nextSearchTerm: string) => {
      if (enableHoverDetail) {
        hideHoverDetail();
      }
      setSearchTerm(nextSearchTerm);
    },
    [enableHoverDetail, hideHoverDetail]
  );

  const getHoverDetailTargetAfterScroll = useCallback(() => {
    const container = listRef.current;
    if (!container) return null;

    if (isKeyboardNavigation && baseHighlightedIdRef.current) {
      const index = filteredOptions.findIndex(
        option => option.id === baseHighlightedIdRef.current
      );
      if (index < 0) return null;

      const element = container.querySelector<HTMLElement>(
        `[role="option"][data-dropdown-option-index="${index}"]`
      );
      return element ? { element, index } : null;
    }

    const pointerPosition = lastPointerPositionRef.current;
    if (!pointerPosition) return null;

    const pointerElement = document.elementFromPoint(
      pointerPosition.x,
      pointerPosition.y
    );
    const optionElement = pointerElement?.closest<HTMLElement>(
      '[role="option"][data-dropdown-option-index]'
    );
    if (!optionElement || !container.contains(optionElement)) return null;

    const index = Number(optionElement.dataset.dropdownOptionIndex);
    if (!Number.isInteger(index)) return null;

    return { element: optionElement, index };
  }, [filteredOptions, isKeyboardNavigation]);

  const restoreHoverDetailAfterScroll = useCallback(() => {
    if (!enableHoverDetail || !effectiveOpen || isFrozen) return;

    const target = getHoverDetailTargetAfterScroll();
    if (!target) return;

    const option = filteredOptions[target.index];
    if (!option) return;

    showHoverDetail(option, target.element, { immediate: true });
  }, [
    effectiveOpen,
    enableHoverDetail,
    filteredOptions,
    getHoverDetailTargetAfterScroll,
    isFrozen,
    showHoverDetail,
  ]);

  const handleListScroll = useCallback(() => {
    handleScroll();

    if (!enableHoverDetail) return;

    const shouldRestoreHoverDetail = suppressHoverDetail();
    if (!shouldRestoreHoverDetail) return;

    if (hoverDetailScrollIdleTimeoutRef.current) {
      clearTimeout(hoverDetailScrollIdleTimeoutRef.current);
    }

    hoverDetailScrollIdleTimeoutRef.current = setTimeout(() => {
      hoverDetailScrollIdleTimeoutRef.current = null;
      restoreHoverDetailAfterScroll();
    }, DROPDOWN_CONSTANTS.HOVER_DETAIL_SCROLL_IDLE_DELAY);
  }, [
    enableHoverDetail,
    handleScroll,
    restoreHoverDetailAfterScroll,
    suppressHoverDetail,
  ]);

  const setLastPointerPosition = useCallback(
    (
      event: React.MouseEvent<HTMLDivElement> | React.WheelEvent<HTMLDivElement>
    ) => {
      lastPointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    []
  );

  const clearLastPointerPosition = useCallback(() => {
    lastPointerPositionRef.current = null;
  }, []);

  useEffect(() => {
    if (
      !enableHoverDetail ||
      !isKeyboardNavigation ||
      !effectiveOpen ||
      isFrozen ||
      !baseHighlightedId
    ) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const container = listRef.current;
      const index = filteredOptions.findIndex(
        option => option.id === baseHighlightedId
      );
      const option = filteredOptions[index];
      const element =
        index >= 0
          ? container?.querySelector<HTMLElement>(
              `[role="option"][data-dropdown-option-index="${index}"]`
            )
          : null;

      if (!container || !option || !element) {
        handleOptionLeave();
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const isVisibleInList =
        elementRect.top >= containerRect.top - 1 &&
        elementRect.bottom <= containerRect.bottom + 1;

      if (!isVisibleInList) {
        handleOptionLeave();
        return;
      }

      showHoverDetail(option, element, { immediate: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    effectiveOpen,
    enableHoverDetail,
    filteredOptions,
    handleOptionLeave,
    baseHighlightedId,
    isFrozen,
    isKeyboardNavigation,
    showHoverDetail,
  ]);

  const triggerText = withCheckbox
    ? selectedOptions.length > 0
      ? selectedOptions.map(option => option.name).join(', ')
      : placeholder
    : (selectedOption?.name ?? placeholder);
  const triggerMetaLabel = withCheckbox ? undefined : selectedOption?.metaLabel;
  const isPlaceholder = withCheckbox
    ? selectedOptions.length === 0
    : !selectedOption;
  const rootValue = withCheckbox ? selectedIds : (value as string) || null;
  const popupWidthStyle = getPopupWidth(portalWidth);
  const inputClassName =
    'w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-10 text-sm text-slate-800 outline-hidden transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15';
  const triggerClassName =
    mode === 'text'
      ? cn(
          'inline-flex min-h-[1.5rem] items-center gap-1 text-base font-medium transition duration-200 ease-in-out',
          disabled
            ? 'cursor-not-allowed text-slate-400'
            : isPlaceholder
              ? 'cursor-pointer text-slate-500 hover:text-slate-600'
              : 'cursor-pointer text-slate-700 hover:text-slate-800'
        )
      : cn(
          'inline-flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-200 ease-in-out',
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-800'
            : hasError
              ? `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_ERROR_CLASS} ${FORM_CONTROL_FOCUS_ERROR_CLASS}`
              : `bg-white text-slate-800 hover:bg-slate-50 ${FORM_CONTROL_BORDER_DEFAULT_CLASS} ${FORM_CONTROL_FOCUS_CLASS}`
        );

  return (
    <div
      ref={rootRef}
      className="relative inline-flex w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Combobox.Root<string, true | false>
        name={name}
        items={optionIds}
        filteredItems={filteredIds}
        value={rootValue}
        multiple={withCheckbox as true | false}
        open={effectiveOpen}
        onOpenChange={handleOpenChange}
        onValueChange={handleValueChange}
        inputValue={searchTerm}
        onInputValueChange={handleInputValueChange}
        onItemHighlighted={handleBaseItemHighlighted}
        itemToStringLabel={item => getOptionName(optionsById, item)}
        itemToStringValue={item => item}
        isItemEqualToValue={(item, selectedValue) => item === selectedValue}
        autoHighlight
        loopFocus
        modal={false}
        virtualized={shouldVirtualize}
        disabled={disabled}
        required={required}
      >
        <Combobox.Trigger
          ref={triggerRef}
          type="button"
          name={name}
          tabIndex={tabIndex}
          disabled={disabled}
          aria-label={triggerText}
          className={triggerClassName}
          onKeyDown={handleTriggerKeyDown}
          onBlur={handleBlur}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-left transition-all duration-200',
                isPlaceholder ? 'text-slate-400' : 'text-slate-800'
              )}
              title={triggerText}
            >
              {triggerText}
            </span>
            {triggerMetaLabel ? (
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {triggerMetaLabel}
              </span>
            ) : null}
          </span>
          <TbChevronDown
            aria-hidden="true"
            className={cn(
              'ml-2 h-4 w-4 shrink-0 self-center transition-transform duration-200',
              effectiveOpen && 'rotate-180'
            )}
          />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner
            className="z-[1060]"
            side={getPopupSide(position)}
            align={getPopupAlign(align)}
            sideOffset={DROPDOWN_CONSTANTS.DROPDOWN_SPACING}
            collisionPadding={DROPDOWN_CONSTANTS.VIEWPORT_MARGIN}
            collisionAvoidance={collisionAvoidance}
          >
            <Combobox.Popup
              className={cn(
                'overflow-hidden rounded-xl bg-white shadow-thin-md transition duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                isFrozen && 'pointer-events-none opacity-80'
              )}
              style={popupWidthStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {searchList ? (
                <div className="sticky top-0 z-10 border-b border-slate-200 p-2">
                  <div className="relative flex items-center">
                    <TbSearch
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute left-3 h-4 w-4',
                        searchState === SEARCH_STATES.IDLE
                          ? 'text-slate-400'
                          : 'text-primary'
                      )}
                    />
                    <Combobox.Input
                      ref={inputRef}
                      placeholder="Cari..."
                      className={inputClassName}
                      onKeyDown={handleSearchKeyDown}
                      onBlur={handleBlur}
                    />
                    {onAddNew &&
                    searchTerm.trim() &&
                    filteredOptions.length === 0 ? (
                      <button
                        type="button"
                        aria-label="Tambah data baru"
                        className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-primary transition hover:bg-primary/10"
                        onMouseDown={event => event.preventDefault()}
                        onClick={handleAddNew}
                      >
                        <TbPlus aria-hidden="true" className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Combobox.Empty className="text-sm text-slate-500">
                <div className="p-3">Tidak ada pilihan yang sesuai</div>
              </Combobox.Empty>

              <Combobox.List
                ref={setListRef}
                className="max-h-60 overflow-y-auto p-1"
                style={
                  shouldVirtualize
                    ? { height: DROPDOWN_CONSTANTS.MAX_HEIGHT }
                    : undefined
                }
                onMouseLeave={clearLastPointerPosition}
                onMouseMove={setLastPointerPosition}
                onScroll={handleListScroll}
                onWheel={setLastPointerPosition}
              >
                {shouldVirtualize ? (
                  <div
                    style={{
                      height: totalSize,
                      position: 'relative',
                    }}
                  >
                    {virtualItems.map(({ index, option, start }) => (
                      <BaseDropdownItem
                        key={option.id}
                        option={option}
                        index={index}
                        searchTerm={searchTerm}
                        selected={selectedIds.includes(option.id)}
                        highlighted={visualHighlightedId === option.id}
                        highlightLayoutId={activeBackgroundLayoutId}
                        withCheckbox={withCheckbox}
                        withRadio={withRadio}
                        onHighlightPreview={handlePointerHighlightPreview}
                        onMouseEnter={showHoverDetail}
                        onMouseLeave={handleOptionLeave}
                        style={{
                          height: itemHeight,
                          left: 0,
                          position: 'absolute',
                          right: 0,
                          top: start,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  virtualItems.map(({ index, option }) => (
                    <BaseDropdownItem
                      key={option.id}
                      option={option}
                      index={index}
                      searchTerm={searchTerm}
                      selected={selectedIds.includes(option.id)}
                      highlighted={visualHighlightedId === option.id}
                      highlightLayoutId={activeBackgroundLayoutId}
                      withCheckbox={withCheckbox}
                      withRadio={withRadio}
                      onHighlightPreview={handlePointerHighlightPreview}
                      onMouseEnter={showHoverDetail}
                      onMouseLeave={handleOptionLeave}
                    />
                  ))
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      {validate ? (
        <ValidationOverlay
          error={errorMessage}
          showError={showValidationOverlay && hasError}
          targetRef={triggerRef}
          autoHide={validationAutoHide}
          autoHideDelay={validationAutoHideDelay}
          onAutoHide={handleAutoHide}
          isHovered={isHovered}
          hasAutoHidden={hasAutoHidden}
          isOpen={effectiveOpen}
        />
      ) : null}

      {enableHoverDetail ? (
        <BaseHoverDetailPopover
          data={hoverDetailData}
          isVisible={isHoverDetailVisible}
          position={hoverDetailPosition}
        />
      ) : null}
    </div>
  );
}

export default Dropdown;
