import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';

const selectedOptionScrollTopInset = 4;

export function useComboboxSelectedOptionScroll<Item>({
  actualOpen,
  isSameItem,
  listRef,
  selectedValue,
  visibleItems,
}: {
  actualOpen: boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  listRef: RefObject<HTMLDivElement | null>;
  selectedValue: Item | null;
  visibleItems: Item[];
}) {
  const [scrollRevision, setScrollRevision] = useState(0);
  const selectedVisibleIndex = useMemo(
    () =>
      selectedValue == null
        ? -1
        : visibleItems.findIndex(item => isSameItem(item, selectedValue)),
    [isSameItem, selectedValue, visibleItems]
  );
  const requestSelectedOptionScroll = useCallback(() => {
    setScrollRevision(revision => revision + 1);
  }, []);

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
  }, [actualOpen, listRef, scrollRevision, selectedVisibleIndex]);

  return {
    requestSelectedOptionScroll,
    selectedVisibleIndex,
  };
}
