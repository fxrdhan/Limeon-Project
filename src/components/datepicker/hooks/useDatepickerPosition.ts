import { useState, useCallback, useEffect } from 'react';
import { DATEPICKER_CONSTANTS } from '../constants';
import type {
  UseDatepickerPositionParams,
  UseDatepickerPositionReturn,
} from '../types';

export const useDatepickerPosition = (
  params: UseDatepickerPositionParams
): UseDatepickerPositionReturn => {
  const { triggerRef, isOpen, portalWidth } = params;

  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = DATEPICKER_CONSTANTS.CALENDAR_HEIGHT;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const shouldDropUp =
      spaceBelow < calendarHeight + 10 && buttonRect.top > calendarHeight + 10;

    setDropDirection(shouldDropUp ? 'up' : 'down');

    const newMenuStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${buttonRect.left + window.scrollX}px`,
      width: portalWidth
        ? typeof portalWidth === 'number'
          ? `${portalWidth}px`
          : portalWidth
        : `${buttonRect.width}px`,
      zIndex: DATEPICKER_CONSTANTS.PORTAL_Z_INDEX,
    };

    const margin = DATEPICKER_CONSTANTS.POSITION_MARGIN;
    if (shouldDropUp) {
      newMenuStyle.top = `${
        buttonRect.top + window.scrollY - calendarHeight - margin
      }px`;
    } else {
      newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
    }

    setPortalStyle(newMenuStyle);
    setIsPositionReady(true);
  }, [triggerRef, portalWidth]);

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
