import { createContext } from 'react';
import type { DatepickerContextState } from '../types';

export const DatepickerContext = createContext<DatepickerContextState | null>(
  null
);
