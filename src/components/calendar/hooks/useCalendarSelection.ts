import { useCallback } from 'react';
import type { CalendarProviderProps } from '../types';
import { createCalendarDate, isDateInRange } from '../utils';

type UseCalendarSelectionParams = {
  mode: NonNullable<CalendarProviderProps['mode']>;
  readOnly?: boolean;
  selectedValue: Date | null;
  minDate?: Date;
  maxDate?: Date;
  isOpen: boolean;
  onChange: CalendarProviderProps['onChange'];
  closeCalendar: () => void;
  focusTrigger: () => void;
};

export const useCalendarSelection = ({
  mode,
  readOnly,
  selectedValue,
  minDate,
  maxDate,
  isOpen,
  onChange,
  closeCalendar,
  focusTrigger,
}: UseCalendarSelectionParams) => {
  const closeCalendarAndRestoreFocus = useCallback(() => {
    closeCalendar();
    focusTrigger();
  }, [closeCalendar, focusTrigger]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (readOnly) return;
      if (!isDateInRange(date, minDate, maxDate)) return;

      onChange(createCalendarDate(date));

      if (mode !== 'inline') {
        closeCalendar();
        focusTrigger();
      }
    },
    [onChange, closeCalendar, focusTrigger, mode, readOnly, minDate, maxDate]
  );

  const handleDateClear = useCallback(() => {
    if (readOnly || !selectedValue) return;

    onChange(null);
    if (mode !== 'inline' && isOpen) {
      closeCalendar();
      focusTrigger();
    }
  }, [
    closeCalendar,
    focusTrigger,
    isOpen,
    mode,
    onChange,
    readOnly,
    selectedValue,
  ]);

  return {
    closeCalendarAndRestoreFocus,
    handleDateSelect,
    handleDateClear,
  };
};
