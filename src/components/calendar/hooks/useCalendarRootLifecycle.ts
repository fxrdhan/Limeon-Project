import { useEffect, useLayoutEffect, useRef } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';

type UseCalendarRootLifecycleParams = {
  isOpen: boolean;
  isOpening: boolean;
  isPositionReady: boolean;
  isInline: boolean;
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
  isInline,
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
    if (isOpen && !isInline) return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToInitialDate();
  }, [isInline, isOpen, selectedValueTime, syncDisplayToInitialDate]);

  useEffect(() => {
    if (!isOpen || isInline) return;
    if (previousSelectedValueTimeRef.current === selectedValueTime) return;

    previousSelectedValueTimeRef.current = selectedValueTime;
    syncDisplayToSelectedValue();
  }, [isInline, isOpen, selectedValueTime, syncDisplayToSelectedValue]);

  useEffect(() => {
    if (!isInline && !isOpen) return;

    syncHighlightToDisplayDate();
  }, [isInline, isOpen, syncHighlightToDisplayDate]);
};
