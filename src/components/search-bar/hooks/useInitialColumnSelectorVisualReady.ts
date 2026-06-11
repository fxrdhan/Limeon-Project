import { useEffect, useState, type RefObject } from 'react';

const INITIAL_COLUMN_SELECTOR_MIN_WAIT_MS = 120;
const INITIAL_COLUMN_SELECTOR_MAX_WAIT_MS = 700;
const INITIAL_COLUMN_SELECTOR_STABLE_FRAMES = 4;
const INITIAL_COLUMN_SELECTOR_POSITION_TOLERANCE = 0.5;

interface UseInitialColumnSelectorVisualReadyParams {
  isOpeningInitialColumnSelector: boolean;
  scrollAreaRef: RefObject<HTMLElement | null>;
}

export const useInitialColumnSelectorVisualReady = ({
  isOpeningInitialColumnSelector,
  scrollAreaRef,
}: UseInitialColumnSelectorVisualReadyParams) => {
  const [
    isInitialColumnSelectorVisuallyReady,
    setIsInitialColumnSelectorVisuallyReady,
  ] = useState(false);

  useEffect(() => {
    if (!isOpeningInitialColumnSelector) {
      setIsInitialColumnSelectorVisuallyReady(false);
      return;
    }

    setIsInitialColumnSelectorVisuallyReady(false);
    let frameId: number | null = null;
    let stableFrameCount = 0;
    let previousRect: {
      height: number;
      left: number;
      top: number;
      width: number;
    } | null = null;
    const startedAt = window.performance.now();

    const readUntilStable = () => {
      const element = scrollAreaRef.current;
      if (!element) {
        frameId = window.requestAnimationFrame(readUntilStable);
        return;
      }

      const rect = element.getBoundingClientRect();
      const popupRect = document
        .querySelector<HTMLElement>('[data-combobox-popup]')
        ?.getBoundingClientRect();
      const nextRect = {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
      const isStable =
        previousRect !== null &&
        Math.abs(nextRect.left - previousRect.left) < 0.5 &&
        Math.abs(nextRect.top - previousRect.top) < 0.5 &&
        Math.abs(nextRect.width - previousRect.width) < 0.5 &&
        Math.abs(nextRect.height - previousRect.height) < 0.5;

      stableFrameCount = isStable ? stableFrameCount + 1 : 0;
      previousRect = nextRect;

      const elapsed = window.performance.now() - startedAt;
      const isPopupAligned =
        popupRect !== undefined &&
        Math.abs(popupRect.left - nextRect.left) <
          INITIAL_COLUMN_SELECTOR_POSITION_TOLERANCE;
      if (
        isPopupAligned &&
        ((elapsed >= INITIAL_COLUMN_SELECTOR_MIN_WAIT_MS &&
          stableFrameCount >= INITIAL_COLUMN_SELECTOR_STABLE_FRAMES) ||
          elapsed >= INITIAL_COLUMN_SELECTOR_MAX_WAIT_MS)
      ) {
        setIsInitialColumnSelectorVisuallyReady(true);
        return;
      }

      frameId = window.requestAnimationFrame(readUntilStable);
    };

    frameId = window.requestAnimationFrame(readUntilStable);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isOpeningInitialColumnSelector, scrollAreaRef]);

  return isInitialColumnSelectorVisuallyReady;
};
