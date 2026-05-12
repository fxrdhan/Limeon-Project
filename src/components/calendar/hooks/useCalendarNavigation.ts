import { useCallback } from 'react';
import {
  clampMonthToRange,
  createDisplayDate,
  isMonthInRange,
  isYearInRange,
} from '../utils';
import type {
  UseCalendarNavigationParams,
  UseCalendarNavigationReturn,
} from '../types';

export const useCalendarNavigation = (
  params: UseCalendarNavigationParams
): UseCalendarNavigationReturn => {
  const { displayDate, setDisplayDate, minDate, maxDate } = params;

  const navigateYear = useCallback(
    (direction: 'prev' | 'next') => {
      const targetYear =
        displayDate.getFullYear() + (direction === 'prev' ? -1 : 1);
      if (!isYearInRange(targetYear, minDate, maxDate)) return false;

      const targetMonth = clampMonthToRange(
        targetYear,
        displayDate.getMonth(),
        minDate,
        maxDate
      );
      setDisplayDate(createDisplayDate(displayDate, targetYear, targetMonth));
      return true;
    },
    [displayDate, maxDate, minDate, setDisplayDate]
  );

  const navigateViewDate = useCallback(
    (direction: 'prev' | 'next') => {
      const targetMonthIndex =
        displayDate.getMonth() + (direction === 'prev' ? -1 : 1);
      const targetYear =
        displayDate.getFullYear() + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

      if (!isMonthInRange(targetYear, targetMonth, minDate, maxDate)) {
        return false;
      }

      setDisplayDate(createDisplayDate(displayDate, targetYear, targetMonth));
      return true;
    },
    [displayDate, maxDate, minDate, setDisplayDate]
  );

  return {
    navigateViewDate,
    navigateYear,
  };
};
