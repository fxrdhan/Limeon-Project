import React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useDatepickerContext } from '../hooks';
import { DATEPICKER_CONSTANTS } from '../constants';
import type { CalendarPortalProps } from '../types';

const CalendarPortal: React.FC<CalendarPortalProps> = ({ children }) => {
  const {
    isOpen,
    isClosing,
    isPositionReady,
    portalStyle,
    dropDirection,
    portalContentRef,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useDatepickerContext();

  if (!isOpen && !isClosing) {
    return null;
  }

  if (!isPositionReady) {
    return null;
  }

  return createPortal(
    <div
      ref={portalContentRef}
      tabIndex={0}
      style={{
        ...portalStyle,
        outline: 'none',
      }}
      className={classNames(
        'bg-white shadow-lg rounded-xl border border-gray-200 p-4',
        `w-[${DATEPICKER_CONSTANTS.CALENDAR_WIDTH}px]`,
        dropDirection === 'down' ? 'origin-top' : 'origin-bottom',
        'transition-all duration-150 ease-out focus:outline-hidden',
        isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      )}
      onMouseEnter={handleCalendarMouseEnter}
      onMouseLeave={handleCalendarMouseLeave}
      onKeyDown={handleCalendarKeyDown}
    >
      {children}
    </div>,
    document.body
  );
};

export default CalendarPortal;
