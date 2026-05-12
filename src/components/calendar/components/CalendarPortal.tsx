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
    setPortalContentRef,
    portalId,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    trigger,
  } = useCalendarContext();

  if (!isOpen && !isClosing) {
    return null;
  }

  return createPortal(
    <div
      ref={setPortalContentRef}
      id={portalId}
      tabIndex={-1}
      style={{
        ...portalStyle,
        pointerEvents: isPositionReady ? undefined : 'none',
        visibility: isPositionReady ? undefined : 'hidden',
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
      aria-label="Pilih tanggal"
      role="dialog"
    >
      {children}
    </div>,
    document.body
  );
};

export default CalendarPortal;
