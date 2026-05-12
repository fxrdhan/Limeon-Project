import { useContext, type Context } from 'react';
import {
  CalendarContentContext,
  CalendarPortalContext,
  CalendarTriggerContext,
} from '../providers/calendarContext';
import type {
  CalendarContentContextState,
  CalendarPortalContextState,
  CalendarTriggerContextState,
} from '../types';

const useRequiredCalendarContext = <T>(
  context: Context<T | null>,
  contextName: string
): T => {
  const value = useContext(context);

  if (!value) {
    throw new Error(`${contextName} must be used within a CalendarProvider`);
  }

  return value;
};

export const useCalendarContentContext = (): CalendarContentContextState =>
  useRequiredCalendarContext(CalendarContentContext, 'CalendarContentContext');

export const useCalendarTriggerContext = (): CalendarTriggerContextState =>
  useRequiredCalendarContext(CalendarTriggerContext, 'CalendarTriggerContext');

export const useCalendarPortalContext = (): CalendarPortalContextState =>
  useRequiredCalendarContext(CalendarPortalContext, 'CalendarPortalContext');
