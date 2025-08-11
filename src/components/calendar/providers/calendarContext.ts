import { createContext } from 'react';
import type { CalendarContextState } from '../types';

export const CalendarContext = createContext<CalendarContextState | null>(null);

// Backward compatibility alias
export const DatepickerContext = CalendarContext;
