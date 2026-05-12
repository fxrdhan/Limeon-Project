import { useCallback, useEffect, useRef } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';
import type { UseCalendarHoverParams, UseCalendarHoverReturn } from '../types';

export const useCalendarHover = (
  params: UseCalendarHoverParams
): UseCalendarHoverReturn => {
  const { openCalendar, closeCalendar, portalRef } = params;

  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTriggerMouseEnter = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      openCalendar();
      focusTimeoutRef.current = setTimeout(() => {
        if (portalRef.current) {
          portalRef.current.focus();
        }
      }, CALENDAR_CONSTANTS.PORTAL_FOCUS_DELAY);
    }, CALENDAR_CONSTANTS.HOVER_OPEN_DELAY);
  }, [openCalendar, portalRef]);

  const handleTriggerMouseLeave = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      if (portalRef.current && !portalRef.current.matches(':hover')) {
        closeCalendar();
      }
    }, CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
  }, [closeCalendar, portalRef]);

  const handleCalendarMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const handleCalendarMouseLeave = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      closeCalendar();
    }, CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
  }, [closeCalendar]);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

  return {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  };
};
