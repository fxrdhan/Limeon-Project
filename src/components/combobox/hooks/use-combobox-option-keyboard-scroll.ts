import type { RefObject } from 'react';
import {
  useComboboxKeyboardHighlightScroll,
  type ComboboxVirtualScrollToIndex,
} from './use-combobox-keyboard-highlight-scroll';

export type { ComboboxVirtualScrollToIndex };

export function useComboboxOptionKeyboardScroll({
  actualOpen,
  getOptionElementAtIndex,
  listRef,
  popupContentRef,
  virtualScrollToIndexRef,
  visibleItemCount,
}: {
  actualOpen: boolean;
  getOptionElementAtIndex: (index: number) => HTMLElement | null;
  listRef: RefObject<HTMLDivElement | null>;
  popupContentRef: RefObject<HTMLDivElement | null>;
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
  visibleItemCount: number;
}) {
  return useComboboxKeyboardHighlightScroll({
    actualOpen,
    getOptionElementAtIndex,
    listRef,
    popupContentRef,
    virtualScrollToIndexRef,
    visibleItemCount,
  });
}
