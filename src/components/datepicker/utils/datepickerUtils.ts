import type { CustomDateValueType } from "../types";

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
  if (minDate) {
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    if (date < min) return false;
  }
  
  if (maxDate) {
    const max = new Date(maxDate);
    max.setHours(0, 0, 0, 0);
    if (date > max) return false;
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
    const minD = new Date(minDate);
    minD.setDate(1);
    minD.setHours(0, 0, 0, 0);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    if (lastDayOfMonth < minD) return false;
  }
  
  if (maxDate) {
    const maxD = new Date(maxDate);
    maxD.setDate(1);
    maxD.setHours(0, 0, 0, 0);
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

// Date comparison utilities
export const isSameDate = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
};

export const isToday = (date: Date): boolean => {
  return date.toDateString() === new Date().toDateString();
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

export const cloneDate = (date: Date): Date => {
  return new Date(date.getTime());
};

// Calendar grid utilities
export const generateCalendarDays = (year: number, month: number): (number | null)[] => {
  const numDays = daysInMonth(year, month);
  let firstDay = firstDayOfMonth(year, month);
  
  // Convert Sunday (0) to Saturday (6) for Monday-first week
  if (firstDay === 0) firstDay = 6;
  else firstDay -= 1;

  const calendarDays: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= numDays; i++) {
    calendarDays.push(i);
  }
  
  return calendarDays;
};

// Navigation utilities
export const navigateDate = (
  currentDate: Date,
  direction: "prev" | "next",
  unit: "day" | "week" | "month" | "year"
): Date => {
  const newDate = cloneDate(currentDate);
  const multiplier = direction === "prev" ? -1 : 1;
  
  switch (unit) {
    case "day":
      newDate.setDate(newDate.getDate() + multiplier);
      break;
    case "week":
      newDate.setDate(newDate.getDate() + (7 * multiplier));
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + multiplier);
      break;
    case "year":
      newDate.setFullYear(newDate.getFullYear() + multiplier);
      break;
  }
  
  return newDate;
};

// Format utilities
export const formatDisplayValue = (
  value: CustomDateValueType,
  locale: string = "id-ID"
): string => {
  if (!value) return "";
  
  return value.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatHeaderContent = (
  date: Date,
  view: "days" | "months" | "years",
  locale: string = "id-ID"
): string => {
  if (view === "days") {
    return date.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  } else if (view === "months") {
    return date.getFullYear().toString();
  }
  
  // years view is handled differently due to decade range
  return "";
};