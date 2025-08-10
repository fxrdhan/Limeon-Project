import { useState, useRef, useCallback } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';
import type {
  UseCalendarStateParams,
  UseCalendarStateReturn,
} from '../types';

export const useCalendarState = (
  params: UseCalendarStateParams
): UseCalendarStateReturn => {
  const { onOpen, onClose } = params;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openCalendar = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setIsOpen(true);
    setIsClosing(false);
    setIsOpening(true);
    
    // Start opening animation after a brief delay to ensure the component is rendered
    openTimeoutRef.current = setTimeout(() => {
      setIsOpening(false);
    }, 10); // Small delay to ensure DOM is ready
    
    onOpen?.();
  }, [onOpen]);

  const closeCalendar = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    setIsClosing(true);
    setIsOpening(false);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClose?.();
    }, CALENDAR_CONSTANTS.ANIMATION_DURATION);
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
    isOpening,
    openCalendar,
    closeCalendar,
  };
};

// Backward compatibility alias
export const useDatepickerState = useCalendarState;
