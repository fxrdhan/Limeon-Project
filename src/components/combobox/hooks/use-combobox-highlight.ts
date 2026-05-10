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
import type { ComboboxRootProps } from '../primitive';
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

export function useComboboxHighlight<Item>({
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
}: {
  actualOpen: boolean;
  canCreate: boolean;
  clearKeyboardScrollHighlight: () => void;
  handleCreate: () => void;
  hideHoverDetail: () => void;
  isItemDisabled: (item: Item) => boolean;
  isKeyboardHoverSuppressed: () => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  items: Item[];
  normalizedInputValue: string;
  requestSelectedOptionScroll: () => void;
  resetKeyboardHoverSuppression: () => void;
  scheduleKeyboardHighlightedScroll: (
    targetVisibleIndex: number,
    sourceVisibleIndex: number | null
  ) => void;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedValue: Item | null;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
  suppressPointerHoverForKeyboard: () => void;
  visibleItems: Item[];
}) {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const effectiveHighlightedIndex = getComboboxEffectiveHighlightIndex({
    actualOpen,
    highlightedIndex,
    isItemDisabled,
    isSameItem,
    items: visibleItems,
    selectedValue,
  });

  const handleHighlightedIndexChange = useCallback(
    (nextHighlightedIndex: number | null) => {
      setHighlightedIndex(nextHighlightedIndex);
    },
    []
  );

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
    },
    [
      actualOpen,
      clearKeyboardScrollHighlight,
      effectiveHighlightedIndex,
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
    handleHighlightedIndexChange,
    handleInputValueChange,
    handleItemHighlighted,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
  };
}
