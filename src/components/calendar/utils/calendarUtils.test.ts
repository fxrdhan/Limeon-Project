import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cloneDate,
  createDateWithTime,
  daysInMonth,
  firstDayOfMonth,
  formatDisplayValue,
  formatHeaderContent,
  generateCalendarDays,
  isDateInRange,
  isMonthInRange,
  isSameDate,
  isToday,
  isYearInRange,
  navigateDate,
} from './calendarUtils';

describe('calendarUtils', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('handles month and first-day calculations', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(firstDayOfMonth(2026, 1)).toBe(new Date(2026, 1, 1).getDay());
  });

  it('validates date range boundaries', () => {
    const targetDate = new Date(2026, 1, 10, 15, 30);
    const minDate = new Date(2026, 1, 10, 0, 0);
    const maxDate = new Date(2026, 1, 11, 0, 0);

    expect(isDateInRange(targetDate, minDate, maxDate)).toBe(true);
    expect(isDateInRange(new Date(2026, 1, 9), minDate, maxDate)).toBe(false);
    expect(isDateInRange(new Date(2026, 1, 12), minDate, maxDate)).toBe(false);
  });

  it('validates month and year ranges', () => {
    const minDate = new Date(2026, 1, 1);
    const maxDate = new Date(2026, 4, 31);

    expect(isMonthInRange(2026, 1, minDate, maxDate)).toBe(true);
    expect(isMonthInRange(2026, 0, minDate, maxDate)).toBe(false);
    expect(isMonthInRange(2026, 5, minDate, maxDate)).toBe(false);

    expect(isYearInRange(2026, minDate, maxDate)).toBe(true);
    expect(isYearInRange(2025, minDate, maxDate)).toBe(false);
    expect(isYearInRange(2027, minDate, maxDate)).toBe(false);
  });

  it('compares dates and detects today correctly', () => {
    const sameDayA = new Date(2026, 1, 8, 10, 0);
    const sameDayB = new Date(2026, 1, 8, 20, 0);
    const differentDay = new Date(2026, 1, 9, 10, 0);

    expect(isSameDate(sameDayA, sameDayB)).toBe(true);
    expect(isSameDate(sameDayA, differentDay)).toBe(false);
    expect(isSameDate(null, sameDayB)).toBe(false);
    expect(isSameDate(sameDayA, null)).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 8, 9, 0, 0));
    expect(isToday(new Date(2026, 1, 8, 23, 59, 59))).toBe(true);
    expect(isToday(new Date(2026, 1, 7, 23, 59, 59))).toBe(false);
  });

  it('creates and clones dates without mutating originals', () => {
    const createdDefault = createDateWithTime(2026, 1, 8);
    const createdCustom = createDateWithTime(2026, 1, 8, 7, 15, 30);
    const original = new Date(2026, 1, 8, 10, 0, 0);
    const cloned = cloneDate(original);

    expect(createdDefault.getHours()).toBe(12);
    expect(createdDefault.getMinutes()).toBe(0);
    expect(createdCustom.getHours()).toBe(7);
    expect(createdCustom.getMinutes()).toBe(15);
    expect(createdCustom.getSeconds()).toBe(30);

    cloned.setFullYear(2030);
    expect(original.getFullYear()).toBe(2026);
    expect(cloned.getFullYear()).toBe(2030);
  });

  it('generates monday-first calendar days and supports navigation', () => {
    const mondayMonth = generateCalendarDays(2025, 8);
    const sundayMonth = generateCalendarDays(2026, 1);

    expect(mondayMonth[0]).toBe(1);
    expect(sundayMonth.slice(0, 6)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(sundayMonth[6]).toBe(1);

    const baseDate = new Date(2026, 1, 10);
    expect(navigateDate(baseDate, 'prev', 'day').getDate()).toBe(9);
    expect(navigateDate(baseDate, 'next', 'week').getDate()).toBe(17);
    expect(navigateDate(baseDate, 'prev', 'month').getMonth()).toBe(0);
    expect(navigateDate(baseDate, 'next', 'year').getFullYear()).toBe(2027);
  });

  it('formats display values and headers per view', () => {
    const date = new Date(2026, 1, 8);

    expect(formatDisplayValue(null)).toBe('');
    expect(formatDisplayValue(date)).toBe(
      date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    );

    expect(formatHeaderContent(date, 'days')).toBe(
      date.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      })
    );
    expect(formatHeaderContent(date, 'months')).toBe('2026');
    expect(formatHeaderContent(date, 'years')).toBe('');
  });
});
