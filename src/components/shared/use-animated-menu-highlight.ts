import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type HighlightFrame = {
  top: number;
  height: number;
  isVisible: boolean;
  shouldAnimate: boolean;
};

export const useAnimatedMenuHighlight = <TElement extends HTMLElement>(
  activeIndex: number | null,
  isEnabled = true
) => {
  const itemRefs = useRef<Array<TElement | null>>([]);
  const visibleActiveIndexRef = useRef<number | null>(null);
  const [highlightFrame, setHighlightFrame] = useState<HighlightFrame>({
    top: 0,
    height: 0,
    isVisible: false,
    shouldAnimate: false,
  });

  const setItemRef = useCallback((index: number, element: TElement | null) => {
    itemRefs.current[index] = element;
  }, []);

  const getItemElement = useCallback(
    (index: number) => itemRefs.current[index] ?? null,
    []
  );

  useLayoutEffect(() => {
    if (!isEnabled || activeIndex === null) {
      visibleActiveIndexRef.current = null;
      setHighlightFrame(frame =>
        frame.isVisible ? { ...frame, isVisible: false } : frame
      );
      return;
    }

    const itemElement = itemRefs.current[activeIndex];
    if (!itemElement) {
      visibleActiveIndexRef.current = null;
      setHighlightFrame(frame =>
        frame.isVisible ? { ...frame, isVisible: false } : frame
      );
      return;
    }

    const updateHighlightFrame = () => {
      const shouldAnimate =
        visibleActiveIndexRef.current !== null &&
        visibleActiveIndexRef.current !== activeIndex;
      visibleActiveIndexRef.current = activeIndex;

      setHighlightFrame(currentFrame => ({
        top: itemElement.offsetTop,
        height: itemElement.offsetHeight,
        isVisible: true,
        shouldAnimate: currentFrame.isVisible && shouldAnimate,
      }));
    };

    updateHighlightFrame();
    const animationFrameId = window.requestAnimationFrame(updateHighlightFrame);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateHighlightFrame);
    resizeObserver?.observe(itemElement);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
    };
  }, [activeIndex, isEnabled]);

  return {
    getItemElement,
    highlightFrame,
    setItemRef,
  };
};
