import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { preventComboboxHandler } from '../utils/preset-dom';

type PointerPosition = {
  x: number;
  y: number;
};

const pointerHoverResumeThreshold = 1;

export function useComboboxPointerHover<Item>({
  onHoverAllowed,
  onLeave,
}: {
  onHoverAllowed: (item: Item, element: HTMLElement) => void;
  onLeave: () => void;
}) {
  const lastPointerPositionRef = useRef<PointerPosition | null>(null);
  const keyboardHoverResumePointerPositionRef = useRef<PointerPosition | null>(
    null
  );
  const keyboardHoverSuppressedRef = useRef(false);
  const [, setIsKeyboardHoverSuppressed] = useState(false);

  const setKeyboardHoverSuppressed = useCallback((nextSuppressed: boolean) => {
    keyboardHoverSuppressedRef.current = nextSuppressed;
    setIsKeyboardHoverSuppressed(nextSuppressed);
  }, []);

  const resetKeyboardHoverSuppression = useCallback(() => {
    keyboardHoverResumePointerPositionRef.current = null;
    setKeyboardHoverSuppressed(false);
  }, [setKeyboardHoverSuppressed]);

  const resetPointerHoverState = useCallback(() => {
    lastPointerPositionRef.current = null;
    resetKeyboardHoverSuppression();
  }, [resetKeyboardHoverSuppression]);

  const suppressPointerHoverForKeyboard = useCallback(() => {
    keyboardHoverResumePointerPositionRef.current =
      lastPointerPositionRef.current;
    setKeyboardHoverSuppressed(true);
  }, [setKeyboardHoverSuppressed]);

  const isKeyboardHoverSuppressed = useCallback(
    () => keyboardHoverSuppressedRef.current,
    []
  );

  const getPointerPosition = useCallback(
    (event: MouseEvent<HTMLElement>): PointerPosition => ({
      x: event.clientX,
      y: event.clientY,
    }),
    []
  );

  const hasPointerMovedFromKeyboardPosition = useCallback(
    (pointerPosition: PointerPosition) => {
      const resumePointerPosition =
        keyboardHoverResumePointerPositionRef.current;

      return (
        !resumePointerPosition ||
        Math.abs(pointerPosition.x - resumePointerPosition.x) >
          pointerHoverResumeThreshold ||
        Math.abs(pointerPosition.y - resumePointerPosition.y) >
          pointerHoverResumeThreshold
      );
    },
    []
  );

  const handleOptionMouseEnter = useCallback(
    (event: MouseEvent<HTMLElement>, item: Item) => {
      lastPointerPositionRef.current = getPointerPosition(event);

      if (keyboardHoverSuppressedRef.current) {
        preventComboboxHandler(event);
        return;
      }

      onHoverAllowed(item, event.currentTarget);
    },
    [getPointerPosition, onHoverAllowed]
  );

  const handleOptionMouseMove = useCallback(
    (event: MouseEvent<HTMLElement>, item: Item) => {
      const pointerPosition = getPointerPosition(event);
      lastPointerPositionRef.current = pointerPosition;

      if (!keyboardHoverSuppressedRef.current) return;

      if (!hasPointerMovedFromKeyboardPosition(pointerPosition)) {
        preventComboboxHandler(event);
        return;
      }

      resetKeyboardHoverSuppression();
      onHoverAllowed(item, event.currentTarget);
    },
    [
      getPointerPosition,
      hasPointerMovedFromKeyboardPosition,
      onHoverAllowed,
      resetKeyboardHoverSuppression,
    ]
  );

  const handleListMouseLeave = useCallback(() => {
    resetPointerHoverState();
    onLeave();
  }, [onLeave, resetPointerHoverState]);

  return {
    handleListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    isKeyboardHoverSuppressed,
    resetKeyboardHoverSuppression,
    resetPointerHoverState,
    suppressPointerHoverForKeyboard,
  };
}
