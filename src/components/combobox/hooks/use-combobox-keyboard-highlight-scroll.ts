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
  type KeyboardScrollDirection,
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

export type ComboboxKeyboardHighlightScrollTarget = {
  direction: KeyboardScrollDirection;
  scrollTop: number;
  wrapped: boolean;
};

export const getComboboxKeyboardHighlightScrollTarget = ({
  container,
  itemCount,
  sourceIndex,
  targetElement,
  targetIndex,
}: {
  container: HTMLElement;
  itemCount: number;
  sourceIndex: number | null;
  targetElement: HTMLElement;
  targetIndex: number;
}): ComboboxKeyboardHighlightScrollTarget | null => {
  const wrapped = isWrappedKeyboardScroll({
    itemCount,
    sourceIndex,
    targetIndex,
  });

  if (wrapped) {
    return {
      direction: targetIndex === 0 ? 'up' : 'down',
      scrollTop:
        targetIndex === 0
          ? 0
          : Math.max(0, container.scrollHeight - container.clientHeight),
      wrapped: true,
    };
  }

  const scrollTarget = getKeyboardScrollTarget({
    container,
    itemCount,
    targetElement,
    targetIndex,
  });

  return scrollTarget ? { ...scrollTarget, wrapped: false } : null;
};

export function useComboboxKeyboardHighlightScroll({
  actualOpen,
  getOptionElementAtIndex,
  listRef,
  popupContentRef,
  visibleItemCount,
}: UseComboboxKeyboardHighlightScrollOptions) {
  const releaseHeldHighlightFrameRef = useRef<number | null>(null);
  const [heldHighlightFrameState, setHeldHighlightFrameState] = useState<{
    frame: KeyboardPinnedHighlightFrame;
    key: string;
  } | null>(null);
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
    setHeldHighlightFrameState(null);
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
      const sourceIndex =
        sourceVisibleIndex === null || sourceVisibleIndex < 0
          ? null
          : sourceVisibleIndex;
      const scrollTarget =
        list && targetElement
          ? getComboboxKeyboardHighlightScrollTarget({
              container: list,
              itemCount: visibleItemCount,
              sourceIndex,
              targetElement,
              targetIndex: targetVisibleIndex,
            })
          : null;

      if (scrollTarget) {
        setPendingKeyboardScroll({
          sourceIndex,
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

    const scrollTarget = getComboboxKeyboardHighlightScrollTarget({
      container: list,
      itemCount: visibleItemCount,
      sourceIndex: pendingKeyboardScroll.sourceIndex,
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

    setHeldHighlightFrameState({
      frame: getKeyboardPinnedHighlightFrame({
        container: list,
        forceTargetEdgeFrame: scrollTarget.wrapped,
        frameRootElement: popupContent,
        scrollDirection: scrollTarget.direction,
        sourceElement,
        targetElement,
      }),
      key: scrollTarget.wrapped
        ? `wrapped-${pendingKeyboardScroll.targetIndex}`
        : 'edge',
    });

    let scrollCommandFrame: number | null = null;
    const startScrollAndRelease = () => {
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
          window.performance.now() - startedAt >=
          keyboardScrollHighlightMaxHold;

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
    };

    if (scrollTarget.wrapped) {
      scrollCommandFrame = window.requestAnimationFrame(startScrollAndRelease);
    } else {
      startScrollAndRelease();
    }

    return () => {
      if (scrollCommandFrame !== null) {
        window.cancelAnimationFrame(scrollCommandFrame);
      }
    };
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
    heldHighlightFrame: heldHighlightFrameState?.frame ?? null,
    heldHighlightFrameKey: heldHighlightFrameState?.key,
    scheduleKeyboardHighlightedScroll,
  };
}
