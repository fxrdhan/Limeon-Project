import { useState, useRef, useCallback } from 'react';
import { DATEPICKER_CONSTANTS } from '../constants';
import type {
  UseDatepickerStateParams,
  UseDatepickerStateReturn,
} from '../types';

export const useDatepickerState = (
  params: UseDatepickerStateParams
): UseDatepickerStateReturn => {
  const { onOpen, onClose } = params;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openCalendar = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setIsOpen(true);
    setIsClosing(false);
    onOpen?.();
  }, [onOpen]);

  const closeCalendar = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClose?.();
    }, DATEPICKER_CONSTANTS.ANIMATION_DURATION);
  }, [onClose]);

  // Cleanup timeouts on unmount
  useState(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  });

  return {
    isOpen,
    isClosing,
    openCalendar,
    closeCalendar,
  };
};
