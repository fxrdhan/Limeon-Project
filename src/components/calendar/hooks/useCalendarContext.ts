import { useContext } from 'react';
import { CalendarContext } from '../providers/calendarContext';
import type { CalendarContextState } from '../types';

export const useCalendarContext = (): CalendarContextState => {
  const context = useContext(CalendarContext);

  if (!context) {
    throw new Error(
      'useCalendarContext must be used within a CalendarProvider'
    );
  }

  return context;
};
