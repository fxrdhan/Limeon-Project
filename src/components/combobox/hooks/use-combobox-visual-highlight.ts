import { useCallback, useEffect, useRef, useState } from 'react';

interface UseComboboxVisualHighlightOptions<Item> {
  actualOpen: boolean;
  firstHighlightableVisibleItem: Item | null;
  getOptionElementAtIndex: (index: number) => HTMLElement | null;
  isItemDisabled: (item: Item) => boolean;
  isItemVisibleAndEnabled: (item: Item) => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  normalizedInputValue: string;
  selectedVisibleIndex: number;
  visibleItems: Item[];
}

export function useComboboxVisualHighlight<Item>({
  actualOpen,
  firstHighlightableVisibleItem,
  getOptionElementAtIndex,
  isItemDisabled,
  isItemVisibleAndEnabled,
  isSameItem,
  normalizedInputValue,
  selectedVisibleIndex,
  visibleItems,
}: UseComboboxVisualHighlightOptions<Item>) {
  const [visualHighlightedValue, setVisualHighlightedValue] =
    useState<Item | null>(null);
  const [visualHighlightedOptionId, setVisualHighlightedOptionId] = useState<
    string | undefined
  >(undefined);
  const visualHighlightedValueRef = useRef<Item | null>(null);
  const previousNormalizedInputValueRef = useRef('');

  const setVisualHighlight = useCallback(
    (item: Item | null, optionId?: string) => {
      visualHighlightedValueRef.current = item;
      setVisualHighlightedValue(item);
      setVisualHighlightedOptionId(item === null ? undefined : optionId);
    },
    []
  );

  const clearVisualHighlight = useCallback(() => {
    setVisualHighlight(null);
  }, [setVisualHighlight]);

  const isItemVisuallyHighlighted = useCallback(
    (item: Item, baseHighlighted: boolean) =>
      visualHighlightedValue == null
        ? baseHighlighted
        : isSameItem(item, visualHighlightedValue),
    [isSameItem, visualHighlightedValue]
  );

  useEffect(() => {
    if (actualOpen) return;

    previousNormalizedInputValueRef.current = '';
    clearVisualHighlight();
  }, [actualOpen, clearVisualHighlight]);

  useEffect(() => {
    if (!actualOpen) return;

    const didClearSearch =
      previousNormalizedInputValueRef.current.length > 0 &&
      normalizedInputValue.length === 0;
    previousNormalizedInputValueRef.current = normalizedInputValue;

    const selectedVisibleItem =
      selectedVisibleIndex >= 0
        ? (visibleItems[selectedVisibleIndex] ?? null)
        : null;

    const nextHighlightedValue =
      selectedVisibleItem && !isItemDisabled(selectedVisibleItem)
        ? selectedVisibleItem
        : firstHighlightableVisibleItem;
    const nextHighlightedIndex =
      nextHighlightedValue == null
        ? -1
        : visibleItems.findIndex(item =>
            isSameItem(item, nextHighlightedValue)
          );
    const nextHighlightedOptionId =
      getOptionElementAtIndex(nextHighlightedIndex)?.id;

    if (didClearSearch) {
      const alreadyHighlighted =
        nextHighlightedValue === null
          ? visualHighlightedValue === null
          : visualHighlightedValue !== null &&
            isSameItem(visualHighlightedValue, nextHighlightedValue);

      if (alreadyHighlighted) return;

      setVisualHighlight(nextHighlightedValue, nextHighlightedOptionId);
      return;
    }

    if (
      visualHighlightedValue != null &&
      isItemVisibleAndEnabled(visualHighlightedValue)
    ) {
      return;
    }

    setVisualHighlight(nextHighlightedValue, nextHighlightedOptionId);
  }, [
    actualOpen,
    firstHighlightableVisibleItem,
    getOptionElementAtIndex,
    isItemDisabled,
    isItemVisibleAndEnabled,
    isSameItem,
    normalizedInputValue,
    selectedVisibleIndex,
    setVisualHighlight,
    visibleItems,
    visualHighlightedValue,
  ]);

  return {
    clearVisualHighlight,
    isItemVisuallyHighlighted,
    setVisualHighlight,
    visualHighlightedOptionId,
    visualHighlightedValueRef,
  };
}
