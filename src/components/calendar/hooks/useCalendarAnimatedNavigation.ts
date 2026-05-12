import { useCallback, useEffect, useRef, useState } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';

type CalendarNavigationDirection = 'prev' | 'next';
type CalendarNavigate = (direction: CalendarNavigationDirection) => boolean;

export const useCalendarAnimatedNavigation = ({
  navigateViewDate,
  navigateYear,
}: {
  navigateViewDate: CalendarNavigate;
  navigateYear: CalendarNavigate;
}) => {
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const yearNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [navigationDirection, setNavigationDirection] =
    useState<CalendarNavigationDirection | null>(null);
  const [yearNavigationDirection, setYearNavigationDirection] =
    useState<CalendarNavigationDirection | null>(null);

  const triggerMonthAnimation = useCallback(
    (direction: CalendarNavigationDirection) => {
      setNavigationDirection(direction);

      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      navigationTimeoutRef.current = setTimeout(() => {
        setNavigationDirection(null);
      }, CALENDAR_CONSTANTS.NAVIGATION_ANIMATION_DURATION);
    },
    []
  );

  const triggerYearAnimation = useCallback(
    (direction: CalendarNavigationDirection) => {
      setYearNavigationDirection(direction);

      if (yearNavigationTimeoutRef.current) {
        clearTimeout(yearNavigationTimeoutRef.current);
      }

      yearNavigationTimeoutRef.current = setTimeout(() => {
        setYearNavigationDirection(null);
      }, CALENDAR_CONSTANTS.NAVIGATION_ANIMATION_DURATION);
    },
    []
  );

  const navigateViewDateWithAnimation = useCallback(
    (direction: CalendarNavigationDirection) => {
      if (!navigateViewDate(direction)) return false;

      triggerMonthAnimation(direction);
      return true;
    },
    [navigateViewDate, triggerMonthAnimation]
  );

  const navigateYearWithAnimation = useCallback(
    (direction: CalendarNavigationDirection) => {
      if (!navigateYear(direction)) return false;

      triggerYearAnimation(direction);
      return true;
    },
    [navigateYear, triggerYearAnimation]
  );

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (yearNavigationTimeoutRef.current) {
        clearTimeout(yearNavigationTimeoutRef.current);
      }
    };
  }, []);

  return {
    navigationDirection,
    yearNavigationDirection,
    navigateViewDate: navigateViewDateWithAnimation,
    navigateYearWithAnimation,
    triggerMonthAnimation,
    triggerYearAnimation,
  };
};
