import { useRef, useCallback } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';
import type { UseCalendarHoverParams, UseCalendarHoverReturn } from '../types';

export const useCalendarHover = (
  params: UseCalendarHoverParams
): UseCalendarHoverReturn => {
  const { openCalendar, closeCalendar, portalRef } = params;

  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTriggerMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      openCalendar();
      setTimeout(() => {
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
    closeTimeoutRef.current = setTimeout(() => {
      closeCalendar();
    }, CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
  }, [closeCalendar]);

  return {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  };
};
