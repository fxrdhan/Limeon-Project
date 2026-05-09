import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  getKeyboardPinnedHighlightFrame,
  getKeyboardScrollTarget,
  hasKeyboardScrollTargetSettled,
  isWrappedKeyboardScroll,
  type KeyboardPinnedHighlightFrame,
} from '@/components/shared/keyboard-pinned-highlight';

const keyboardScrollHighlightMaxHold = 700;

const scrollElementTo = (element: HTMLElement, top: number) => {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top, behavior: 'smooth' });
    return;
  }

  element.scrollTop = top;
};

interface UseComboboxKeyboardHighlightScrollOptions {
  actualOpen: boolean;
  getOptionElementAtIndex: (index: number) => HTMLElement | null;
  listRef: RefObject<HTMLDivElement | null>;
  popupContentRef: RefObject<HTMLDivElement | null>;
  visibleItemCount: number;
}

export function useComboboxKeyboardHighlightScroll({
  actualOpen,
  getOptionElementAtIndex,
  listRef,
  popupContentRef,
  visibleItemCount,
}: UseComboboxKeyboardHighlightScrollOptions) {
  const releaseHeldHighlightFrameRef = useRef<number | null>(null);
  const [heldHighlightFrame, setHeldHighlightFrame] =
    useState<KeyboardPinnedHighlightFrame | null>(null);
  const [pendingKeyboardScroll, setPendingKeyboardScroll] = useState<{
    sourceIndex: number | null;
    targetIndex: number;
  } | null>(null);

  const clearKeyboardScrollHighlight = useCallback(() => {
    if (releaseHeldHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      releaseHeldHighlightFrameRef.current = null;
    }

    setPendingKeyboardScroll(null);
    setHeldHighlightFrame(null);
  }, []);

  const scheduleKeyboardHighlightedScroll = useCallback(
    (targetVisibleIndex: number, sourceVisibleIndex: number | null) => {
      if (
        !Number.isInteger(targetVisibleIndex) ||
        targetVisibleIndex < 0 ||
        targetVisibleIndex >= visibleItemCount
      ) {
        clearKeyboardScrollHighlight();
        return;
      }

      const list = listRef.current;
      const targetElement = getOptionElementAtIndex(targetVisibleIndex);
      const scrollTarget =
        list && targetElement
          ? getKeyboardScrollTarget({
              container: list,
              itemCount: visibleItemCount,
              targetElement,
              targetIndex: targetVisibleIndex,
            })
          : null;

      if (scrollTarget) {
        setPendingKeyboardScroll({
          sourceIndex:
            sourceVisibleIndex === null || sourceVisibleIndex < 0
              ? null
              : sourceVisibleIndex,
          targetIndex: targetVisibleIndex,
        });
        return;
      }

      clearKeyboardScrollHighlight();
    },
    [
      clearKeyboardScrollHighlight,
      getOptionElementAtIndex,
      listRef,
      visibleItemCount,
    ]
  );

  useEffect(() => {
    if (!actualOpen || pendingKeyboardScroll === null) return;

    const list = listRef.current;
    const popupContent = popupContentRef.current;
    const targetElement = getOptionElementAtIndex(
      pendingKeyboardScroll.targetIndex
    );
    const sourceElement =
      pendingKeyboardScroll.sourceIndex === null
        ? null
        : getOptionElementAtIndex(pendingKeyboardScroll.sourceIndex);

    if (!list || !popupContent || !targetElement) {
      clearKeyboardScrollHighlight();
      return;
    }

    const scrollTarget = getKeyboardScrollTarget({
      container: list,
      itemCount: visibleItemCount,
      targetElement,
      targetIndex: pendingKeyboardScroll.targetIndex,
    });

    if (scrollTarget === null) {
      clearKeyboardScrollHighlight();
      return;
    }

    if (releaseHeldHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      releaseHeldHighlightFrameRef.current = null;
    }

    setHeldHighlightFrame(
      getKeyboardPinnedHighlightFrame({
        container: list,
        forceTargetEdgeFrame: isWrappedKeyboardScroll({
          itemCount: visibleItemCount,
          sourceIndex: pendingKeyboardScroll.sourceIndex,
          targetIndex: pendingKeyboardScroll.targetIndex,
        }),
        frameRootElement: popupContent,
        scrollDirection: scrollTarget.direction,
        sourceElement,
        targetElement,
      })
    );
    scrollElementTo(list, scrollTarget.scrollTop);

    const startedAt = window.performance.now();
    const releaseWhenSettled = () => {
      const currentList = listRef.current;
      const currentTargetElement = getOptionElementAtIndex(
        pendingKeyboardScroll.targetIndex
      );

      if (!currentList || !currentTargetElement) {
        clearKeyboardScrollHighlight();
        return;
      }

      const hasHeldLongEnough =
        window.performance.now() - startedAt >= keyboardScrollHighlightMaxHold;

      if (
        hasKeyboardScrollTargetSettled({
          container: currentList,
          scrollTop: scrollTarget.scrollTop,
          targetElement: currentTargetElement,
        }) ||
        hasHeldLongEnough
      ) {
        clearKeyboardScrollHighlight();
        return;
      }

      releaseHeldHighlightFrameRef.current =
        window.requestAnimationFrame(releaseWhenSettled);
    };

    releaseHeldHighlightFrameRef.current =
      window.requestAnimationFrame(releaseWhenSettled);
  }, [
    actualOpen,
    clearKeyboardScrollHighlight,
    getOptionElementAtIndex,
    listRef,
    pendingKeyboardScroll,
    popupContentRef,
    visibleItemCount,
  ]);

  useEffect(() => {
    if (!actualOpen) clearKeyboardScrollHighlight();
  }, [actualOpen, clearKeyboardScrollHighlight]);

  useEffect(
    () => () => {
      if (releaseHeldHighlightFrameRef.current !== null) {
        window.cancelAnimationFrame(releaseHeldHighlightFrameRef.current);
      }
    },
    []
  );

  return {
    clearKeyboardScrollHighlight,
    heldHighlightFrame,
    scheduleKeyboardHighlightedScroll,
  };
}
