import { useState, useCallback, useLayoutEffect } from 'react';
import { CALENDAR_CONSTANTS } from '../constants';
import type {
  UseCalendarPositionParams,
  UseCalendarPositionReturn,
} from '../types';

export const useCalendarPosition = (
  params: UseCalendarPositionParams
): UseCalendarPositionReturn => {
  const {
    triggerRef,
    isOpen,
    portalWidth,
    calendarWidth = CALENDAR_CONSTANTS.CALENDAR_WIDTH,
    calendarHeight = CALENDAR_CONSTANTS.CALENDAR_HEIGHT,
  } = params;

  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const margin = CALENDAR_CONSTANTS.POSITION_MARGIN;
    const spaceBelow = viewportHeight - buttonRect.bottom - margin;
    const spaceAbove = buttonRect.top - margin;

    const shouldDropUp =
      (spaceBelow < calendarHeight && spaceAbove > calendarHeight) ||
      (spaceBelow < calendarHeight && spaceAbove > spaceBelow);

    setDropDirection(shouldDropUp ? 'up' : 'down');

    const newMenuStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${buttonRect.left}px`,
      width: portalWidth
        ? typeof portalWidth === 'number'
          ? `${portalWidth}px`
          : portalWidth
        : `${calendarWidth}px`,
      zIndex: CALENDAR_CONSTANTS.PORTAL_Z_INDEX,
    };

    if (shouldDropUp) {
      newMenuStyle.top = `${buttonRect.top - calendarHeight - margin - 3}px`; // Extra offset untuk calendar yang muncul ke atas
    } else {
      newMenuStyle.top = `${buttonRect.bottom + margin}px`;
    }

    setPortalStyle(newMenuStyle);
    setIsPositionReady(true);
  }, [triggerRef, portalWidth, calendarWidth, calendarHeight]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(() => {
      setIsPositionReady(false);
      calculatePosition();
    });

    const handleScroll = () => calculatePosition();
    const handleResize = () => calculatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, calculatePosition]);

  return {
    portalStyle,
    isPositionReady,
    dropDirection,
    calculatePosition,
  };
};

// Backward compatibility alias
export const useDatepickerPosition = useCalendarPosition;
