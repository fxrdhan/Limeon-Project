import { createContext } from 'react';
import type {
  CalendarContentContextState,
  CalendarPortalContextState,
  CalendarTriggerContextState,
} from '../types';

export const CalendarContentContext =
  createContext<CalendarContentContextState | null>(null);
export const CalendarTriggerContext =
  createContext<CalendarTriggerContextState | null>(null);
export const CalendarPortalContext =
  createContext<CalendarPortalContextState | null>(null);
