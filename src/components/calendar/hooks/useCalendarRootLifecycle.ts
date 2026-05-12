import { useEffect, useLayoutEffect, useRef } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';
import type { CalendarMode } from '../types';

type UseCalendarRootLifecycleParams = {
  isOpen: boolean;
  isOpening: boolean;
  isPositionReady: boolean;
  mode: CalendarMode;
  selectedValueTime: number | null;
  setIsOpening: (value: boolean) => void;
  syncDisplayToInitialDate: () => void;
  syncDisplayToSelectedValue: () => void;
  syncHighlightToDisplayDate: () => void;
};

export const useCalendarRootLifecycle = ({
  isOpen,
  isOpening,
  isPositionReady,
  mode,
  selectedValueTime,
  setIsOpening,
  syncDisplayToInitialDate,
  syncDisplayToSelectedValue,
  syncHighlightToDisplayDate,
}: UseCalendarRootLifecycleParams) => {
  const previousSelectedValueTimeRef = useRef(selectedValueTime);

  useEffect(() => {
    if (isOpen && isPositionReady && isOpening) {
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, CALENDAR_CONSTANTS.OPENING_READY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isPositionReady, isOpening, setIsOpening]);

  useLayoutEffect(() => {
    if (isOpen && mode !== 'inline') return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToInitialDate();
  }, [isOpen, mode, selectedValueTime, syncDisplayToInitialDate]);

  useEffect(() => {
    if (!isOpen || mode === 'inline') return;
    if (previousSelectedValueTimeRef.current === selectedValueTime) return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToSelectedValue();
  }, [isOpen, mode, selectedValueTime, syncDisplayToSelectedValue]);

  useEffect(() => {
    if (mode !== 'inline' && !isOpen) return;

    syncHighlightToDisplayDate();
  }, [isOpen, mode, syncHighlightToDisplayDate]);
};
