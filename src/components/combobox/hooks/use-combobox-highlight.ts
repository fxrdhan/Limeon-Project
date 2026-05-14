import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { ComboboxRootProps } from '../internal/primitive';
import { preventComboboxHandler } from '../utils/preset-dom';
import {
  getComboboxDefaultHighlightIndex,
  getComboboxEffectiveHighlightIndex,
  getComboboxSelectedHighlightIndex,
  isComboboxListNavigationKey,
  isComboboxPrintableSearchKey,
} from '../utils/preset-highlight';

type ComboboxHighlightDetails<Item> = Parameters<
  NonNullable<ComboboxRootProps<Item>['onItemHighlighted']>
>[1];

type ComboboxHighlightCreation = {
  canCreate: boolean;
  handleCreate: () => void;
};

type ComboboxHighlightInteraction = {
  actualOpen: boolean;
};

type ComboboxHighlightHoverDetail = {
  hideHoverDetail: () => void;
  isKeyboardHoverSuppressed: () => boolean;
  resetKeyboardHoverSuppression: () => void;
  suppressPointerHoverForKeyboard: () => void;
};

type ComboboxHighlightScroll = {
  clearKeyboardScrollHighlight: () => void;
  requestSelectedOptionScroll: () => void;
  scheduleKeyboardHighlightedScroll: (
    targetVisibleIndex: number,
    sourceVisibleIndex: number | null
  ) => void;
};

type ComboboxHighlightSearch = {
  normalizedInputValue: string;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
};

type ComboboxHighlightSelection<Item> = {
  isItemDisabled: (item: Item) => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  selectedValue: Item | null;
  visibleItems: readonly Item[];
};

export interface ComboboxHighlightOptions<Item> {
  creation: ComboboxHighlightCreation;
  hoverDetail: ComboboxHighlightHoverDetail;
  interaction: ComboboxHighlightInteraction;
  scroll: ComboboxHighlightScroll;
  search: ComboboxHighlightSearch;
  selection: ComboboxHighlightSelection<Item>;
}

export function useComboboxHighlight<Item>({
  creation,
  hoverDetail,
  interaction,
  scroll,
  search,
  selection,
}: ComboboxHighlightOptions<Item>) {
  const { canCreate, handleCreate } = creation;
  const {
    hideHoverDetail,
    isKeyboardHoverSuppressed,
    resetKeyboardHoverSuppression,
    suppressPointerHoverForKeyboard,
  } = hoverDetail;
  const { actualOpen } = interaction;
  const {
    clearKeyboardScrollHighlight,
    requestSelectedOptionScroll,
    scheduleKeyboardHighlightedScroll,
  } = scroll;
  const {
    normalizedInputValue,
    searchable,
    searchInputRef,
    setInputValue,
    setIsSearchNavigationFocus,
  } = search;
  const { isItemDisabled, isSameItem, items, selectedValue, visibleItems } =
    selection;
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const defaultHighlightedValue =
    normalizedInputValue.length === 0 ? selectedValue : null;

  const effectiveHighlightedIndex = getComboboxEffectiveHighlightIndex({
    actualOpen,
    highlightedIndex,
    isItemDisabled,
    isSameItem,
    items: visibleItems,
    selectedValue: defaultHighlightedValue,
  });

  const handleInputValueChange = useCallback(
    (nextValue: string) => {
      const shouldRestoreDefaultHighlight = nextValue.trim().length === 0;
      const nextHighlightedIndex = shouldRestoreDefaultHighlight
        ? getComboboxDefaultHighlightIndex({
            isItemDisabled,
            isSameItem,
            items,
            selectedValue,
          })
        : null;

      setInputValue(nextValue);
      setHighlightedIndex(nextHighlightedIndex);
      setIsSearchNavigationFocus(false);
      resetKeyboardHoverSuppression();
      clearKeyboardScrollHighlight();
      hideHoverDetail();

      if (shouldRestoreDefaultHighlight) {
        requestSelectedOptionScroll();
      }
    },
    [
      clearKeyboardScrollHighlight,
      hideHoverDetail,
      isItemDisabled,
      isSameItem,
      items,
      requestSelectedOptionScroll,
      resetKeyboardHoverSuppression,
      selectedValue,
      setInputValue,
      setIsSearchNavigationFocus,
    ]
  );

  const handleItemHighlighted = useCallback(
    (
      nextHighlighted: Item | undefined,
      details: ComboboxHighlightDetails<Item>
    ) => {
      if (!actualOpen) {
        setHighlightedIndex(null);
        return;
      }

      if (nextHighlighted === undefined) {
        if (details.reason === 'pointer') return;

        resetKeyboardHoverSuppression();
        clearKeyboardScrollHighlight();
        setHighlightedIndex(
          getComboboxDefaultHighlightIndex({
            isItemDisabled,
            isSameItem,
            items: visibleItems,
            selectedValue,
          })
        );
        return;
      }

      if (
        details.reason === 'none' &&
        normalizedInputValue.length === 0 &&
        selectedValue !== null &&
        !isSameItem(nextHighlighted, selectedValue)
      ) {
        const selectedIndex = getComboboxSelectedHighlightIndex({
          isItemDisabled,
          isSameItem,
          items: visibleItems,
          selectedValue,
        });

        if (selectedIndex !== null) {
          details.cancel();
          setHighlightedIndex(selectedIndex);
        }
        return;
      }

      if (details.reason === 'pointer' && isKeyboardHoverSuppressed()) {
        details.cancel();
        return;
      }

      if (details.reason === 'keyboard') {
        suppressPointerHoverForKeyboard();
        if (
          typeof KeyboardEvent !== 'undefined' &&
          details.event instanceof KeyboardEvent &&
          details.event.repeat
        ) {
          hideHoverDetail();
        }
        scheduleKeyboardHighlightedScroll(
          details.index,
          effectiveHighlightedIndex
        );
      } else {
        if (details.reason === 'pointer') {
          resetKeyboardHoverSuppression();
        }

        clearKeyboardScrollHighlight();
      }

      setHighlightedIndex(details.index);
    },
    [
      actualOpen,
      clearKeyboardScrollHighlight,
      effectiveHighlightedIndex,
      hideHoverDetail,
      isItemDisabled,
      isKeyboardHoverSuppressed,
      isSameItem,
      normalizedInputValue.length,
      resetKeyboardHoverSuppression,
      scheduleKeyboardHighlightedScroll,
      selectedValue,
      suppressPointerHoverForKeyboard,
      visibleItems,
    ]
  );

  const handleSearchInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (isComboboxListNavigationKey(event.key)) {
        setIsSearchNavigationFocus(true);
        return;
      }

      setIsSearchNavigationFocus(false);
      if (event.key !== 'Enter') return;

      const highlightedItem =
        effectiveHighlightedIndex === null
          ? undefined
          : visibleItems[effectiveHighlightedIndex];
      if (highlightedItem !== undefined && !isItemDisabled(highlightedItem)) {
        return;
      }

      if (!canCreate) return;

      event.preventDefault();
      event.stopPropagation();
      preventComboboxHandler(event);
      handleCreate();
    },
    [
      canCreate,
      effectiveHighlightedIndex,
      handleCreate,
      isItemDisabled,
      setIsSearchNavigationFocus,
      visibleItems,
    ]
  );

  const handleTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!searchable || !actualOpen) return;
      if (isComboboxListNavigationKey(event.key)) {
        setIsSearchNavigationFocus(true);
        return;
      }

      if (!isComboboxPrintableSearchKey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      preventComboboxHandler(event);
      setIsSearchNavigationFocus(false);
      setInputValue(currentValue => `${currentValue}${event.key}`);
      setHighlightedIndex(null);
      resetKeyboardHoverSuppression();
      clearKeyboardScrollHighlight();
      hideHoverDetail();
      searchInputRef.current?.focus({ preventScroll: true });
    },
    [
      actualOpen,
      clearKeyboardScrollHighlight,
      hideHoverDetail,
      resetKeyboardHoverSuppression,
      searchable,
      searchInputRef,
      setInputValue,
      setIsSearchNavigationFocus,
    ]
  );

  useLayoutEffect(() => {
    if (actualOpen) return;

    setInputValue('');
    setHighlightedIndex(null);
  }, [actualOpen, setInputValue]);

  useEffect(() => {
    if (!actualOpen) return;

    if (highlightedIndex === effectiveHighlightedIndex) return;

    setHighlightedIndex(effectiveHighlightedIndex);
  }, [actualOpen, effectiveHighlightedIndex, highlightedIndex]);

  return {
    effectiveHighlightedIndex,
    handleInputValueChange,
    handleItemHighlighted,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
  };
}
