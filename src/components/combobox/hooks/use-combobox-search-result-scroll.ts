import { useLayoutEffect, type RefObject } from 'react';

export function useComboboxSearchResultScroll<Item>({
  actualOpen,
  listRef,
  normalizedInputValue,
  visibleItems,
}: {
  actualOpen: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  normalizedInputValue: string;
  visibleItems: readonly Item[];
}) {
  useLayoutEffect(() => {
    if (!actualOpen || normalizedInputValue.length === 0) return;

    const list = listRef.current;
    if (!list) return;

    list.scrollTop = 0;
  }, [actualOpen, listRef, normalizedInputValue, visibleItems]);
}
