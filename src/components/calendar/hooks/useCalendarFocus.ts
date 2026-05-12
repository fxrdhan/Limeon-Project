import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';

interface UseCalendarFocusParams {
  triggerInputRef: RefObject<HTMLElement | null>;
  portalContentRef: RefObject<HTMLDivElement | null>;
}

export const useCalendarFocus = ({
  triggerInputRef,
  portalContentRef,
}: UseCalendarFocusParams) => {
  const focusPortalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const returnFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const focusPortal = useCallback(() => {
    if (focusPortalTimeoutRef.current) {
      clearTimeout(focusPortalTimeoutRef.current);
    }

    focusPortalTimeoutRef.current = setTimeout(() => {
      const focusTarget =
        portalContentRef.current?.querySelector<HTMLElement>(
          '[data-calendar-grid]'
        ) ?? portalContentRef.current;
      focusTarget?.focus();
    }, 0);
  }, [portalContentRef]);

  const focusTrigger = useCallback(
    (delay = CALENDAR_CONSTANTS.FOCUS_RESTORE_DELAY) => {
      if (returnFocusTimeoutRef.current) {
        clearTimeout(returnFocusTimeoutRef.current);
      }

      returnFocusTimeoutRef.current = setTimeout(() => {
        triggerInputRef.current?.focus();
      }, delay);
    },
    [triggerInputRef]
  );

  useEffect(() => {
    return () => {
      if (focusPortalTimeoutRef.current) {
        clearTimeout(focusPortalTimeoutRef.current);
      }
      if (returnFocusTimeoutRef.current) {
        clearTimeout(returnFocusTimeoutRef.current);
      }
    };
  }, []);

  return { focusPortal, focusTrigger };
};
