import type { CalendarDateValue } from '../types';

export const cloneDate = (date: Date): Date => {
  return new Date(date.getTime());
};

const toCalendarDate = (date: Date): Date => {
  const calendarDate = cloneDate(date);
  calendarDate.setHours(0, 0, 0, 0);
  return calendarDate;
};

// Date creation utilities
export const createDateWithTime = (
  year: number,
  month: number,
  day: number,
  hour: number = 12,
  minute: number = 0,
  second: number = 0
): Date => {
  return new Date(year, month, day, hour, minute, second);
};

export const createCalendarDate = (date: Date): Date =>
  createDateWithTime(date.getFullYear(), date.getMonth(), date.getDate());

export const normalizeCalendarDateValue = (
  value: CalendarDateValue
): CalendarDateValue => (value ? createCalendarDate(value) : null);

// Date calculation utilities
export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

export const firstDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 1).getDay();

// Date validation utilities
export const isDateInRange = (
  date: Date,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  const normalizedDate = toCalendarDate(date);

  if (minDate) {
    const min = toCalendarDate(minDate);
    if (normalizedDate < min) return false;
  }

  if (maxDate) {
    const max = toCalendarDate(maxDate);
    if (normalizedDate > max) return false;
  }

  return true;
};

export const isMonthInRange = (
  year: number,
  month: number,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  if (minDate) {
    const minD = toCalendarDate(minDate);
    minD.setDate(1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    if (lastDayOfMonth < minD) return false;
  }

  if (maxDate) {
    const maxD = toCalendarDate(maxDate);
    maxD.setDate(1);
    const firstDayOfMonth = new Date(year, month, 1);
    if (firstDayOfMonth > maxD) return false;
  }

  return true;
};

export const isYearInRange = (
  year: number,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  if (minDate && year < new Date(minDate).getFullYear()) return false;
  if (maxDate && year > new Date(maxDate).getFullYear()) return false;
  return true;
};

export const clampDateToRange = (
  date: Date,
  minDate?: Date,
  maxDate?: Date
): Date => {
  const normalizedDate = toCalendarDate(date);
  if (minDate && normalizedDate < toCalendarDate(minDate)) {
    return createCalendarDate(minDate);
  }
  if (maxDate && normalizedDate > toCalendarDate(maxDate)) {
    return createCalendarDate(maxDate);
  }
  return createCalendarDate(date);
};

export const clampMonthToRange = (
  year: number,
  month: number,
  minDate?: Date,
  maxDate?: Date
): number => {
  if (minDate) {
    const min = new Date(minDate);
    if (year === min.getFullYear() && month < min.getMonth()) {
      return min.getMonth();
    }
  }

  if (maxDate) {
    const max = new Date(maxDate);
    if (year === max.getFullYear() && month > max.getMonth()) {
      return max.getMonth();
    }
  }

  return month;
};

// Date comparison utilities
export const isSameDate = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isToday = (date: Date): boolean => {
  return isSameDate(date, new Date());
};

export const createDisplayDate = (
  sourceDate: Date,
  year: number,
  month: number
): Date => {
  const day = Math.min(sourceDate.getDate(), daysInMonth(year, month));

  return new Date(
    year,
    month,
    day,
    sourceDate.getHours(),
    sourceDate.getMinutes(),
    sourceDate.getSeconds(),
    sourceDate.getMilliseconds()
  );
};

type GenerateCalendarDaysOptions = {
  fixedWeekCount?: boolean;
};

// Calendar grid utilities
export const generateCalendarDays = (
  year: number,
  month: number,
  options: GenerateCalendarDaysOptions = {}
): (number | null)[] => {
  const numDays = daysInMonth(year, month);
  let firstDay = firstDayOfMonth(year, month);

  // Convert Sunday (0) to Saturday (6) for Monday-first week
  if (firstDay === 0) firstDay = 6;
  else firstDay -= 1;

  const calendarDays: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= numDays; i++) {
    calendarDays.push(i);
  }

  if (options.fixedWeekCount) {
    while (calendarDays.length < 42) {
      calendarDays.push(null);
    }
  }

  return calendarDays;
};

// Format utilities
export const formatDisplayValue = (
  value: CalendarDateValue,
  locale: string = 'id-ID'
): string => {
  if (!value) return '';

  return value.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateOnlyValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateOnlyValue = (value: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnlyMatch) {
    throw new Error('Expected a date-only value in YYYY-MM-DD format.');
  }

  const [, yearText, monthText, dayText] = dateOnlyMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = createDateWithTime(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error('Expected a valid date-only value.');
  }

  return parsedDate;
};

export const formatAccessibleDate = (
  value: Date,
  locale: string = 'id-ID'
): string =>
  value.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
