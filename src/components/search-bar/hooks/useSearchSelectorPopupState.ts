import { useEffect, useMemo, type RefObject } from 'react';
import type { ActiveSearchSelector } from './useActiveSearchSelector';
import { useInitialColumnSelectorVisualReady } from './useInitialColumnSelectorVisualReady';

interface UseSearchSelectorPopupStateProps {
  activeSelector: ActiveSearchSelector | null;
  value: string;
  dismissedSelectorValue: string | null;
  suppressSelectors: boolean;
  isOpeningInitialColumnSelector: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  selectorOutsideIgnoreRefs?: RefObject<HTMLElement | null>[];
  onSelectorOpenChange?: (isOpen: boolean) => void;
}

export const useSearchSelectorPopupState = ({
  activeSelector,
  value,
  dismissedSelectorValue,
  suppressSelectors,
  isOpeningInitialColumnSelector,
  containerRef,
  scrollAreaRef,
  selectorOutsideIgnoreRefs,
  onSelectorOpenChange,
}: UseSearchSelectorPopupStateProps) => {
  const selectorIgnoredOutsidePressRefs = useMemo(
    () => [containerRef, ...(selectorOutsideIgnoreRefs ?? [])],
    [containerRef, selectorOutsideIgnoreRefs]
  );
  const isInitialColumnSelectorVisuallyReady =
    useInitialColumnSelectorVisualReady({
      isOpeningInitialColumnSelector,
      scrollAreaRef,
    });

  const isSelectorPopupVisible =
    activeSelector !== null &&
    !suppressSelectors &&
    dismissedSelectorValue !== value;
  const isSelectorPopupVisuallyReady =
    !isOpeningInitialColumnSelector || isInitialColumnSelectorVisuallyReady;

  useEffect(() => {
    onSelectorOpenChange?.(isSelectorPopupVisible);
  }, [isSelectorPopupVisible, onSelectorOpenChange]);

  return {
    selectorIgnoredOutsidePressRefs,
    isSelectorPopupVisible,
    isSelectorPopupVisuallyReady,
  };
};
