import { useCallback, useRef } from 'react';
import type React from 'react';
import type { ComboboxItemMeta } from '../primitive-context';
import { getNextEnabledIndex } from '../utils/primitive-keyboard';
import { normalizeComboboxHighlightedIndex } from '../utils/primitive-root';

export function useComboboxRootCollection<Value>({
  filteredItems,
  highlightedIndex,
  isItemDisabled,
}: {
  filteredItems: Value[];
  highlightedIndex: number | null;
  isItemDisabled: (itemValue: Value) => boolean;
}) {
  const itemMetaRef = useRef(new Map<number, ComboboxItemMeta<Value>>());
  const filteredItemsRef = useRef<Value[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const activeIndexState = normalizeComboboxHighlightedIndex(
    highlightedIndex,
    filteredItems.length
  );

  filteredItemsRef.current = filteredItems;
  activeIndexRef.current = activeIndexState;

  const isItemIndexDisabled = useCallback(
    (index: number) => {
      const item = filteredItemsRef.current[index];
      if (item === undefined) return true;

      const meta = itemMetaRef.current.get(index);
      if (meta?.value === item) {
        return meta.disabled || isItemDisabled(item);
      }

      return isItemDisabled(item);
    },
    [isItemDisabled]
  );
  const registerItem = useCallback(
    (index: number, meta: ComboboxItemMeta<Value>) => {
      itemMetaRef.current.set(index, meta);
      return () => {
        const currentMeta = itemMetaRef.current.get(index);
        if (currentMeta?.value === meta.value) {
          itemMetaRef.current.delete(index);
        }
      };
    },
    []
  );
  const getNextEnabledComboboxIndex = useCallback(
    (direction: 1 | -1, fromIndex: number | null) =>
      getNextEnabledIndex({
        direction,
        fromIndex,
        isIndexDisabled: isItemIndexDisabled,
        itemCount: filteredItemsRef.current.length,
      }),
    [isItemIndexDisabled]
  );

  return {
    activeIndexRef: activeIndexRef as React.MutableRefObject<number | null>,
    activeIndexState,
    filteredItemsRef: filteredItemsRef as React.MutableRefObject<Value[]>,
    getNextEnabledComboboxIndex,
    isItemIndexDisabled,
    registerItem,
  };
}
