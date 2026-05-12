import { useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  clampMonthToRange,
  createDisplayDate,
  isMonthInRange,
  isYearInRange,
} from '../utils';

type CalendarNavigationDirection = 'prev' | 'next';

type UseCalendarHeaderControlsParams = {
  displayDate: Date;
  minDate?: Date;
  maxDate?: Date;
  setDisplayDate: Dispatch<SetStateAction<Date>>;
  navigateViewDate: (direction: CalendarNavigationDirection) => boolean;
  triggerMonthAnimation: (direction: CalendarNavigationDirection) => void;
  triggerYearAnimation: (direction: CalendarNavigationDirection) => void;
  calculatePosition: () => void;
};

export const useCalendarHeaderControls = ({
  displayDate,
  minDate,
  maxDate,
  setDisplayDate,
  navigateViewDate,
  triggerMonthAnimation,
  triggerYearAnimation,
  calculatePosition,
}: UseCalendarHeaderControlsParams) => {
  const handleNavigatePrev = useCallback(() => {
    if (navigateViewDate('prev')) calculatePosition();
  }, [calculatePosition, navigateViewDate]);

  const handleNavigateNext = useCallback(() => {
    if (navigateViewDate('next')) calculatePosition();
  }, [calculatePosition, navigateViewDate]);

  const handleMonthChange = useCallback(
    (month: number) => {
      const currentMonth = displayDate.getMonth();
      const currentYear = displayDate.getFullYear();

      if (!isMonthInRange(currentYear, month, minDate, maxDate)) return;

      if (month !== currentMonth) {
        const direction = month > currentMonth ? 'next' : 'prev';

        triggerMonthAnimation(direction);
        setDisplayDate(createDisplayDate(displayDate, currentYear, month));
      }

      calculatePosition();
    },
    [
      calculatePosition,
      displayDate,
      maxDate,
      minDate,
      setDisplayDate,
      triggerMonthAnimation,
    ]
  );

  const handleYearChange = useCallback(
    (year: number) => {
      const currentYear = displayDate.getFullYear();

      if (!isYearInRange(year, minDate, maxDate)) return;

      if (year !== currentYear) {
        const direction = year > currentYear ? 'next' : 'prev';
        const targetMonth = clampMonthToRange(
          year,
          displayDate.getMonth(),
          minDate,
          maxDate
        );

        triggerYearAnimation(direction);
        setDisplayDate(createDisplayDate(displayDate, year, targetMonth));
      }

      calculatePosition();
    },
    [
      calculatePosition,
      displayDate,
      maxDate,
      minDate,
      setDisplayDate,
      triggerYearAnimation,
    ]
  );

  return {
    handleMonthChange,
    handleNavigateNext,
    handleNavigatePrev,
    handleYearChange,
  };
};
