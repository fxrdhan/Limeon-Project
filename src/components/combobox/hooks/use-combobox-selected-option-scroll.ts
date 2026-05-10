import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';

const selectedOptionScrollTopInset = 4;

export function useComboboxSelectedOptionScroll<Item>({
  actualOpen,
  enabled,
  isSameItem,
  listRef,
  selectedValue,
  visibleItems,
}: {
  actualOpen: boolean;
  enabled: boolean;
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
    if (!actualOpen || !enabled || selectedVisibleIndex < 0) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;

      const option = list.querySelector<HTMLElement>(
        getPharmaComboboxOptionIndexSelector(selectedVisibleIndex)
      );
      if (!option) return;

      const listTop = list.getBoundingClientRect().top;
      const optionTop = option.getBoundingClientRect().top;
      list.scrollTop += optionTop - listTop - selectedOptionScrollTopInset;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [actualOpen, enabled, listRef, scrollRevision, selectedVisibleIndex]);

  return {
    requestSelectedOptionScroll,
    selectedVisibleIndex,
  };
}
