import { useState, useCallback, useEffect } from 'react';
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
    currentHeight = CALENDAR_CONSTANTS.CALENDAR_HEIGHT,
    resizable = false,
  } = params;

  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = resizable
      ? currentHeight
      : CALENDAR_CONSTANTS.CALENDAR_HEIGHT;
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
      left: `${buttonRect.left + window.scrollX}px`,
      width: portalWidth
        ? typeof portalWidth === 'number'
          ? `${portalWidth}px`
          : portalWidth
        : `${buttonRect.width}px`,
      zIndex: CALENDAR_CONSTANTS.PORTAL_Z_INDEX,
    };

    if (shouldDropUp) {
      newMenuStyle.top = `${
        buttonRect.top + window.scrollY - calendarHeight - margin - 3
      }px`; // Extra offset untuk calendar yang muncul ke atas
    } else {
      newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
    }

    setPortalStyle(newMenuStyle);
    setIsPositionReady(true);
  }, [triggerRef, portalWidth, currentHeight, resizable]);

  useEffect(() => {
    if (isOpen) {
      setIsPositionReady(false);
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    } else {
      setIsPositionReady(false);
    }

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
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
