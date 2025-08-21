import React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useCalendarContext } from '../hooks';
import type { CalendarPortalProps } from '../types';

const CalendarPortal: React.FC<CalendarPortalProps> = ({ children }) => {
  const {
    isOpen,
    isClosing,
    isOpening,
    isPositionReady,
    portalStyle,
    dropDirection,
    portalContentRef,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    trigger,
  } = useCalendarContext();

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
        'calendar__container',
        'calendar__container--portal',
        dropDirection === 'down'
          ? 'calendar__container--drop-down'
          : 'calendar__container--drop-up',
        {
          'calendar__container--closing': isClosing,
          'calendar__container--opening': isOpening,
          'calendar__container--open': !isClosing && !isOpening,
        }
      )}
      onKeyDown={handleCalendarKeyDown}
      onMouseEnter={trigger === 'hover' ? handleCalendarMouseEnter : undefined}
      onMouseLeave={trigger === 'hover' ? handleCalendarMouseLeave : undefined}
    >
      {children}
    </div>,
    document.body
  );
};

export default CalendarPortal;
