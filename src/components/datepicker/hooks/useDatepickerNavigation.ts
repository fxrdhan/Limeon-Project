import { useCallback } from 'react';
import { DATEPICKER_CONSTANTS } from '../constants';
import type {
  UseDatepickerNavigationParams,
  UseDatepickerNavigationReturn,
} from '../types';

export const useDatepickerNavigation = (
  params: UseDatepickerNavigationParams
): UseDatepickerNavigationReturn => {
  const { currentView, setDisplayDate } = params;

  const navigateYear = useCallback(
    (direction: 'prev' | 'next') => {
      setDisplayDate(prev => {
        const newDate = new Date(prev);
        newDate.setFullYear(
          newDate.getFullYear() + (direction === 'prev' ? -1 : 1)
        );
        return newDate;
      });
    },
    [setDisplayDate]
  );

  const navigateViewDate = useCallback(
    (direction: 'prev' | 'next') => {
      setDisplayDate(prev => {
        const newDate = new Date(prev);
        if (currentView === 'days') {
          newDate.setDate(1);
          newDate.setMonth(
            newDate.getMonth() + (direction === 'prev' ? -1 : 1)
          );
        } else if (currentView === 'months') {
          newDate.setFullYear(
            newDate.getFullYear() + (direction === 'prev' ? -1 : 1)
          );
        } else if (currentView === 'years') {
          const decadeShift = DATEPICKER_CONSTANTS.DECADE_SHIFT;
          newDate.setFullYear(
            newDate.getFullYear() +
              (direction === 'prev' ? -decadeShift : decadeShift)
          );
        }
        return newDate;
      });
    },
    [setDisplayDate, currentView]
  );

  return {
    navigateViewDate,
    navigateYear,
  };
};
