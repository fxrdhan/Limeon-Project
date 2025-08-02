import { useContext } from 'react';
import { DatepickerContext } from '../providers/datepickerContext';
import type { DatepickerContextState } from '../types';

export const useDatepickerContext = (): DatepickerContextState => {
  const context = useContext(DatepickerContext);

  if (!context) {
    throw new Error(
      'useDatepickerContext must be used within a DatepickerProvider'
    );
  }

  return context;
};
