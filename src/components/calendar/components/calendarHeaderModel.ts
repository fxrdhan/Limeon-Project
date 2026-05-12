import { DEFAULT_CALENDAR_YEAR_WINDOW, MONTH_NAMES_ID } from '../constants';
import { isMonthInRange, isYearInRange } from '../utils';

export const getCalendarHeaderModel = (
  displayDate: Date,
  minDate?: Date,
  maxDate?: Date
) => {
  const currentYear = displayDate.getFullYear();
  const previousMonth = new Date(currentYear, displayDate.getMonth() - 1, 1);
  const nextMonth = new Date(currentYear, displayDate.getMonth() + 1, 1);
  const firstYear = minDate
    ? minDate.getFullYear()
    : currentYear - DEFAULT_CALENDAR_YEAR_WINDOW.past;
  const lastYear = maxDate
    ? maxDate.getFullYear()
    : currentYear + DEFAULT_CALENDAR_YEAR_WINDOW.future;
  const firstOptionYear = Math.min(firstYear, lastYear);
  const lastOptionYear = Math.max(firstYear, lastYear);

  return {
    canNavigateNext: isMonthInRange(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      minDate,
      maxDate
    ),
    canNavigatePrev: isMonthInRange(
      previousMonth.getFullYear(),
      previousMonth.getMonth(),
      minDate,
      maxDate
    ),
    currentYear,
    isMonthDisabled: (month: number) =>
      !isMonthInRange(currentYear, month, minDate, maxDate),
    isYearDisabled: (year: number) => !isYearInRange(year, minDate, maxDate),
    monthOptions: MONTH_NAMES_ID.map((_, index) => index),
    yearOptions: Array.from(
      { length: lastOptionYear - firstOptionYear + 1 },
      (_, index) => firstOptionYear + index
    ),
  };
};
