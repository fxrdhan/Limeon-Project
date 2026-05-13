import { useEffect } from 'react';
import type React from 'react';
import type { ComboboxEventReason as EventReason } from '../utils/primitive-events';
import { getNextEnabledIndex } from '../utils/primitive-keyboard';

export function useComboboxRootAutoHighlight({
  activeIndexRef,
  autoHighlight,
  filteredItemCount,
  isItemIndexDisabled,
  open,
  setActiveIndex,
}: {
  activeIndexRef: React.MutableRefObject<number | null>;
  autoHighlight: boolean;
  filteredItemCount: number;
  isItemIndexDisabled: (index: number) => boolean;
  open: boolean;
  setActiveIndex: (
    index: number | null,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => void;
}) {
  useEffect(() => {
    if (!open) {
      setActiveIndex(null, 'none');
      return;
    }

    if (filteredItemCount === 0) {
      setActiveIndex(null, 'none');
      return;
    }

    if (!autoHighlight) {
      if (
        activeIndexRef.current !== null &&
        activeIndexRef.current >= filteredItemCount
      ) {
        setActiveIndex(null, 'none');
      }
      return;
    }

    if (
      activeIndexRef.current !== null &&
      activeIndexRef.current < filteredItemCount &&
      !isItemIndexDisabled(activeIndexRef.current)
    ) {
      setActiveIndex(activeIndexRef.current, 'none');
      return;
    }

    setActiveIndex(
      getNextEnabledIndex({
        direction: 1,
        fromIndex: null,
        isIndexDisabled: isItemIndexDisabled,
        itemCount: filteredItemCount,
      }),
      'none'
    );
  }, [
    activeIndexRef,
    autoHighlight,
    filteredItemCount,
    isItemIndexDisabled,
    open,
    setActiveIndex,
  ]);
}
