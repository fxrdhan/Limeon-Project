import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { motion } from 'motion/react';
import { TbSearch } from 'react-icons/tb';
import {
  createTypedCombobox,
  type ComboboxChangeEventDetails,
  type ComboboxHighlightEventDetails,
  type ComboboxRootProps,
  type PharmaComboboxClassNames,
  type PharmaComboboxOptionRenderState,
} from '@/components/combobox';
import { comboboxHighlightBackgroundTransition } from '@/components/combobox/components/combobox-highlight-motion';
import { ComboboxOptionList } from '@/components/combobox/components/combobox-option-list';
import type { ComboboxSearchHeaderProps } from '@/components/combobox/components/combobox-search-header';
import { usePharmaComboboxSelectController } from '@/components/combobox/hooks/use-pharma-combobox-select-controller';
import { cn } from '@/lib/utils';
import { BaseSelectorProps } from '../../types';

const SearchSelectorCombobox = createTypedCombobox<unknown>();
const searchSelectorHighlightClassName = 'bg-slate-100';
const searchSelectorClassNames = {
  optionHighlight: searchSelectorHighlightClassName,
} satisfies PharmaComboboxClassNames;
const selectorPopupTransition = 'transition-[left,top] duration-150 ease-out';
const forwardedSelectorKeys = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Enter',
  'Escape',
]);

const isPlainCharacterKey = (event: KeyboardEvent) =>
  event.key.length === 1 &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.isComposing;

const blockOriginalKeyEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const createSelectorComboboxDetails = (
  reason: ComboboxChangeEventDetails['reason'],
  event?: Event
): ComboboxChangeEventDetails => {
  let canceled = false;

  return {
    cancel: () => {
      canceled = true;
    },
    event,
    get isCanceled() {
      return canceled;
    },
    reason,
  };
};

const setReactRef = <Element,>(
  ref: React.Ref<Element> | undefined,
  value: Element | null
) => {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as React.MutableRefObject<Element | null>).current = value;
};

const getSelectedValue = <T,>(
  items: readonly T[],
  defaultSelectedIndex: number | undefined
) => {
  if (defaultSelectedIndex === undefined || items.length === 0) return null;

  const boundedIndex = Math.min(
    Math.max(defaultSelectedIndex, 0),
    items.length - 1
  );

  return items[boundedIndex] ?? null;
};

function SearchSelectorHeader({
  controlName,
  isSearchNavigationFocus,
  normalizedInputValue,
  onNavigationFocusChange,
  onSearchInputKeyDown,
  searchInputRef,
  searchPlaceholder,
}: ComboboxSearchHeaderProps) {
  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-[220px] items-center gap-2">
        <TbSearch
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0',
            normalizedInputValue ? 'text-primary' : 'text-slate-400'
          )}
        />
        <SearchSelectorCombobox.Input
          ref={searchInputRef}
          role="searchbox"
          data-pharma-combobox-navigation-focus={
            isSearchNavigationFocus ? '' : undefined
          }
          className={cn(
            'min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-slate-800 outline-hidden placeholder:text-slate-400 focus:ring-0',
            isSearchNavigationFocus ? 'ring-0' : 'focus:text-slate-900'
          )}
          aria-label={`Cari ${controlName}`}
          aria-required={false}
          placeholder={searchPlaceholder}
          tabIndex={0}
          onKeyDown={onSearchInputKeyDown}
          onPointerDown={() => {
            onNavigationFocusChange(false);
          }}
          onBlur={() => {
            onNavigationFocusChange(false);
          }}
        />
      </div>
    </div>
  );
}

type BaseSelectorContentProps<T> = BaseSelectorProps<T> & {
  activeContentKey: string;
  ignoredOutsidePressRefs: React.RefObject<HTMLElement | null>[];
  isVisuallyReady: boolean;
  modalPosition: {
    x: number;
    y: number;
  };
};

function BaseSelectorContent<T>({
  activeContentKey,
  items,
  onSelect,
  onClose,
  modalPosition,
  searchTerm: externalSearchTerm = '',
  config,
  defaultSelectedIndex,
  onHighlightChange,
  ignoredOutsidePressRefs,
  isVisuallyReady,
}: BaseSelectorContentProps<T>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputValueRef = useRef('');
  const initializedContentKeyRef = useRef<string | null>(null);
  const selectedValue = useMemo(
    () => getSelectedValue(items, defaultSelectedIndex),
    [defaultSelectedIndex, items]
  );
  const popupMaxHeight = `min(${config.maxHeight}, calc(100vh - ${Math.max(
    modalPosition.y + 8,
    0
  )}px))`;

  const isInsideIgnoredOutsidePressTarget = useCallback(
    (event?: Event) => {
      const target = event?.target;
      if (!(target instanceof Node)) return false;

      return ignoredOutsidePressRefs.some(ref => ref.current?.contains(target));
    },
    [ignoredOutsidePressRefs]
  );

  const renderOption = useCallback(
    (item: T, state: PharmaComboboxOptionRenderState) => {
      const secondaryText = config.getItemSecondaryText?.(item);
      const description = config.getItemDescription?.(item);

      return (
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'shrink-0 transition-colors duration-150',
              state.highlighted
                ? (config.getItemActiveColor?.(item) ?? 'text-slate-900')
                : 'text-slate-500'
            )}
          >
            {config.getItemIcon(item)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">
                {config.getItemLabel(item)}
              </span>
              {secondaryText ? (
                <span className="shrink-0 text-xs text-slate-400">
                  {secondaryText}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                {description}
              </span>
            ) : null}
          </span>
        </span>
      );
    },
    [config]
  );

  const { highlight, options, popup, root, search } =
    usePharmaComboboxSelectController<T>({
      items,
      value: selectedValue,
      onValueChange: item => {
        if (item !== null) onSelect(item);
      },
      item: {
        toLabel: config.getItemLabel,
        toValue: config.getItemKey,
        isEqualToValue: (item, value) =>
          config.getItemKey(item) === config.getItemKey(value),
      },
      field: {
        label: config.headerText,
        aria: {
          label: config.headerText,
        },
      },
      interaction: {
        open: true,
        onOpenChange: (open, details) => {
          if (open || details.reason === 'item-press') return;

          if (isInsideIgnoredOutsidePressTarget(details.event)) {
            details.cancel();
            return;
          }

          onClose();
        },
      },
      display: {
        indicator: 'none',
        renderOption,
      },
      search: {
        enabled: true,
        placeholder: 'Cari...',
      },
    });

  const setSelectorInputValue = useCallback(
    (nextValue: string, event?: Event) => {
      root.comboboxRootProps.onInputValueChange?.(
        nextValue,
        createSelectorComboboxDetails('input-change', event)
      );
    },
    [root.comboboxRootProps]
  );

  useEffect(() => {
    inputValueRef.current = options.optionListProps.inputValue;
  }, [options.optionListProps.inputValue]);

  useLayoutEffect(() => {
    if (initializedContentKeyRef.current === activeContentKey) return;

    initializedContentKeyRef.current = activeContentKey;
    setSelectorInputValue(externalSearchTerm);
  }, [activeContentKey, externalSearchTerm, setSelectorInputValue]);

  useLayoutEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [activeContentKey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      const selectorInput = inputRef.current;
      if (!selectorInput || event.target === selectorInput) return;

      if (isPlainCharacterKey(event)) {
        blockOriginalKeyEvent(event);
        selectorInput.focus({ preventScroll: true });
        setSelectorInputValue(`${inputValueRef.current}${event.key}`, event);
        return;
      }

      if (event.key === 'Backspace') {
        blockOriginalKeyEvent(event);
        selectorInput.focus({ preventScroll: true });
        setSelectorInputValue(inputValueRef.current.slice(0, -1), event);
        return;
      }

      if (!forwardedSelectorKeys.has(event.key)) return;

      blockOriginalKeyEvent(event);
      selectorInput.focus({ preventScroll: true });
      selectorInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          altKey: event.altKey,
          bubbles: true,
          cancelable: true,
          code: event.code,
          ctrlKey: event.ctrlKey,
          key: event.key,
          metaKey: event.metaKey,
          repeat: event.repeat,
          shiftKey: event.shiftKey,
        })
      );
    };

    document.addEventListener('keydown', handleDocumentKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [setSelectorInputValue]);

  useEffect(
    () => () => {
      onHighlightChange?.(null);
    },
    [onHighlightChange]
  );

  const setSearchInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      setReactRef(search.searchHeaderProps.searchInputRef, node);
    },
    [search.searchHeaderProps.searchInputRef]
  );

  const handleItemHighlighted = useCallback(
    (item: T | undefined, details: ComboboxHighlightEventDetails) => {
      root.comboboxRootProps.onItemHighlighted?.(item, details);

      if (!details.isCanceled) {
        onHighlightChange?.(item ?? null);
      }
    },
    [onHighlightChange, root.comboboxRootProps]
  );

  const SearchSelectorRoot = SearchSelectorCombobox.Root as unknown as (
    props: ComboboxRootProps<T>
  ) => React.ReactElement | null;
  const comboboxRootProps = {
    ...root.comboboxRootProps,
    onItemHighlighted: handleItemHighlighted,
  } satisfies ComboboxRootProps<T>;

  const searchHeaderProps = {
    ...search.searchHeaderProps,
    searchInputRef: setSearchInputRef,
  };
  const trimmedInputValue = options.optionListProps.inputValue.trim();
  const noResultsMessage = trimmedInputValue
    ? config.noResultsText.replace('{searchTerm}', trimmedInputValue)
    : 'Tidak ditemukan';
  const popupStyle = {
    left: modalPosition.x,
    top: modalPosition.y,
  } satisfies CSSProperties;
  const contentStyle = {
    maxHeight: popupMaxHeight,
  } satisfies CSSProperties;

  return (
    <div
      ref={root.rootRef}
      className={root.className}
      onBlur={root.handleComboboxBlur}
    >
      <SearchSelectorRoot {...comboboxRootProps}>
        <SearchSelectorCombobox.Popup
          initialFocus={false}
          className={cn(
            'fixed z-50 w-max min-w-[220px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl bg-white shadow-thin-md',
            selectorPopupTransition,
            isVisuallyReady ? 'visible' : 'pointer-events-none invisible'
          )}
          style={popupStyle}
        >
          <div
            ref={popup.contentRef}
            className={cn(
              'relative flex flex-col overflow-hidden transition-[opacity,transform] duration-150 ease-out',
              isVisuallyReady
                ? 'translate-y-0 scale-100 opacity-100'
                : '-translate-y-1 scale-[0.98] opacity-0'
            )}
            style={contentStyle}
            onBlur={root.handleComboboxBlur}
          >
            <div
              data-search-selector-content=""
              className="relative flex min-h-0 flex-col overflow-hidden"
            >
              {highlight.heldFrame ? (
                <motion.div
                  key={highlight.heldFrameKey}
                  aria-hidden="true"
                  data-pharma-combobox-pinned-highlight=""
                  className={cn(
                    'pointer-events-none absolute z-0 rounded-lg',
                    searchSelectorHighlightClassName
                  )}
                  style={highlight.heldFrame}
                  initial={false}
                  animate={highlight.heldFrame}
                  transition={comboboxHighlightBackgroundTransition}
                />
              ) : null}
              {search.searchable ? (
                <SearchSelectorHeader {...searchHeaderProps} />
              ) : null}
              <ComboboxOptionList
                {...options.optionListProps}
                classNames={searchSelectorClassNames}
              />
              {!options.hasVisibleItems ? (
                <SearchSelectorCombobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                  {noResultsMessage}
                </SearchSelectorCombobox.Empty>
              ) : null}
            </div>
          </div>
        </SearchSelectorCombobox.Popup>
      </SearchSelectorRoot>
    </div>
  );
}

function BaseSelector<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm,
  config,
  defaultSelectedIndex,
  onHighlightChange,
  contentKey,
  outsideClickIgnoreRef,
  outsideClickIgnoreRefs,
  isVisuallyReady = true,
}: BaseSelectorProps<T>) {
  const activeContentKey = contentKey ?? config.headerText;
  const isPositionReady = position.isReady ?? true;
  const currentModalPosition = useMemo(
    () => ({
      x: position.left,
      y: position.top + 5,
    }),
    [position.left, position.top]
  );
  const [lastReadyModalPosition, setLastReadyModalPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const modalPosition = isPositionReady
    ? currentModalPosition
    : lastReadyModalPosition;
  const ignoredOutsidePressRefs = useMemo(
    () => [
      ...(outsideClickIgnoreRef ? [outsideClickIgnoreRef] : []),
      ...(outsideClickIgnoreRefs ?? []),
    ],
    [outsideClickIgnoreRef, outsideClickIgnoreRefs]
  );
  useEffect(() => {
    if (!isOpen) onHighlightChange?.(null);
  }, [isOpen, onHighlightChange]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setLastReadyModalPosition(null);
      return;
    }

    if (!isPositionReady) return;

    setLastReadyModalPosition(previous => {
      if (
        previous &&
        Math.abs(previous.x - currentModalPosition.x) < 0.5 &&
        Math.abs(previous.y - currentModalPosition.y) < 0.5
      ) {
        return previous;
      }

      return currentModalPosition;
    });
  }, [currentModalPosition, isOpen, isPositionReady]);

  if (!isOpen || modalPosition === null) return null;

  return (
    <BaseSelectorContent<T>
      activeContentKey={activeContentKey}
      items={items}
      isOpen={isOpen}
      onSelect={onSelect}
      onClose={onClose}
      position={position}
      searchTerm={searchTerm}
      config={config}
      defaultSelectedIndex={defaultSelectedIndex}
      onHighlightChange={onHighlightChange}
      contentKey={contentKey}
      outsideClickIgnoreRef={outsideClickIgnoreRef}
      outsideClickIgnoreRefs={outsideClickIgnoreRefs}
      ignoredOutsidePressRefs={ignoredOutsidePressRefs}
      isVisuallyReady={isVisuallyReady}
      modalPosition={modalPosition}
    />
  );
}

export default BaseSelector;
