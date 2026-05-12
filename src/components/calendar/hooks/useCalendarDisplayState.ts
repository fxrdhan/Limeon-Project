import { useCallback, useMemo, useState } from 'react';
import type { CalendarDateValue } from '../types';
import {
  clampDateToRange,
  createCalendarDate,
  createDisplayDate,
  isDateInRange,
  isSameDate,
  normalizeCalendarDateValue,
} from '../utils';

const isDateInDisplayMonth = (
  date: Date | null,
  displayDate: Date
): date is Date =>
  Boolean(
    date &&
    date.getMonth() === displayDate.getMonth() &&
    date.getFullYear() === displayDate.getFullYear()
  );

export const useCalendarDisplayState = ({
  value,
  minDate,
  maxDate,
}: {
  value: CalendarDateValue;
  minDate?: Date;
  maxDate?: Date;
}) => {
  const valueTime = value?.getTime() ?? null;
  const selectedValue = useMemo(
    () =>
      normalizeCalendarDateValue(
        valueTime === null ? null : new Date(valueTime)
      ),
    [valueTime]
  );
  const initialDisplayDate = useMemo(
    () =>
      clampDateToRange(
        selectedValue || createCalendarDate(new Date()),
        minDate,
        maxDate
      ),
    [maxDate, minDate, selectedValue]
  );
  const [displayDate, setDisplayDate] = useState(initialDisplayDate);
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);

  const syncDisplayToSelectedValue = useCallback(() => {
    const nextDisplayDate = clampDateToRange(
      selectedValue || new Date(),
      minDate,
      maxDate
    );
    setDisplayDate(nextDisplayDate);
    setHighlightedDate(nextDisplayDate);
  }, [maxDate, minDate, selectedValue]);

  const syncDisplayToInitialDate = useCallback(() => {
    setDisplayDate(initialDisplayDate);
  }, [initialDisplayDate]);

  const resetHighlightedDate = useCallback(() => {
    setHighlightedDate(null);
  }, []);

  const getHighlightForDisplayDate = useCallback(
    (targetDisplayDate: Date) => {
      if (
        isDateInDisplayMonth(selectedValue, targetDisplayDate) &&
        isDateInRange(selectedValue, minDate, maxDate)
      ) {
        return new Date(selectedValue);
      }

      const targetDate = clampDateToRange(
        createDisplayDate(
          targetDisplayDate,
          targetDisplayDate.getFullYear(),
          targetDisplayDate.getMonth()
        ),
        minDate,
        maxDate
      );

      if (
        !isDateInDisplayMonth(targetDate, targetDisplayDate) ||
        !isDateInRange(targetDate, minDate, maxDate)
      ) {
        return null;
      }

      return targetDate;
    },
    [maxDate, minDate, selectedValue]
  );

  const syncHighlightToDisplayDate = useCallback(() => {
    setHighlightedDate(currentHighlightedDate => {
      if (
        isDateInDisplayMonth(currentHighlightedDate, displayDate) &&
        isDateInRange(currentHighlightedDate, minDate, maxDate)
      ) {
        return currentHighlightedDate;
      }

      const nextHighlightedDate = getHighlightForDisplayDate(displayDate);
      if (isSameDate(currentHighlightedDate, nextHighlightedDate)) {
        return currentHighlightedDate;
      }

      return nextHighlightedDate;
    });
  }, [displayDate, getHighlightForDisplayDate, maxDate, minDate]);

  return {
    selectedValue,
    displayDate,
    highlightedDate,
    setDisplayDate,
    setHighlightedDate,
    resetHighlightedDate,
    syncDisplayToInitialDate,
    syncDisplayToSelectedValue,
    syncHighlightToDisplayDate,
  };
};
