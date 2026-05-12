import { useMemo } from 'react';
import { createCalendarDate } from '../utils';

type UseCalendarBoundsParams = {
  minDate?: Date;
  maxDate?: Date;
};

export const useCalendarBounds = ({
  minDate,
  maxDate,
}: UseCalendarBoundsParams) => {
  const minDateTime = minDate?.getTime() ?? null;
  const maxDateTime = maxDate?.getTime() ?? null;

  return useMemo(
    () => ({
      minDate:
        minDateTime === null
          ? undefined
          : createCalendarDate(new Date(minDateTime)),
      maxDate:
        maxDateTime === null
          ? undefined
          : createCalendarDate(new Date(maxDateTime)),
    }),
    [maxDateTime, minDateTime]
  );
};
