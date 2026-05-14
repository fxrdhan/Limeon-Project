import { useCallback, type RefObject } from 'react';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';

const comboboxHighlightSelector = '[data-pharma-combobox-highlight]';
const comboboxPinnedHighlightSelector =
  '[data-pharma-combobox-pinned-highlight]';

export function useComboboxOptionElements({
  listRef,
}: {
  listRef: RefObject<HTMLDivElement | null>;
}) {
  const getOptionElementAtIndex = useCallback(
    (index: number) => {
      if (!Number.isInteger(index) || index < 0) return null;

      return (
        listRef.current?.querySelector<HTMLElement>(
          getPharmaComboboxOptionIndexSelector(index)
        ) ?? null
      );
    },
    [listRef]
  );

  const isOptionElementFullyVisible = useCallback(
    (element: HTMLElement) => {
      const list = listRef.current;
      if (!list) return false;

      const listRect = list.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      return (
        elementRect.top >= listRect.top && elementRect.bottom <= listRect.bottom
      );
    },
    [listRef]
  );

  return {
    getOptionElementAtIndex,
    isOptionElementFullyVisible,
  };
}

export function useComboboxHighlightedOptionAnchor({
  getOptionElementAtIndex,
  hasHeldHighlightFrame,
  popupContentRef,
}: {
  getOptionElementAtIndex: (index: number) => HTMLElement | null;
  hasHeldHighlightFrame: boolean;
  popupContentRef: RefObject<HTMLDivElement | null>;
}) {
  return useCallback(
    (index: number) => {
      const pinnedHighlight = hasHeldHighlightFrame
        ? popupContentRef.current?.querySelector<HTMLElement>(
            comboboxPinnedHighlightSelector
          )
        : null;
      if (pinnedHighlight) return pinnedHighlight;

      const optionElement = getOptionElementAtIndex(index);

      return (
        optionElement?.querySelector<HTMLElement>(comboboxHighlightSelector) ??
        optionElement
      );
    },
    [getOptionElementAtIndex, hasHeldHighlightFrame, popupContentRef]
  );
}
