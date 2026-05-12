import React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { CALENDAR_CONSTANTS } from '../constants';
import { useCalendarModalIsolation, useCalendarPortalContext } from '../hooks';
import type { CalendarPortalProps } from '../types';

const CalendarPortal: React.FC<CalendarPortalProps> = ({
  children,
  container,
}) => {
  const {
    isOpen,
    isClosing,
    isOpening,
    isPositionReady,
    portalStyle,
    dropDirection,
    setPortalContentRef,
    portalId,
    portalTitleId,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    trigger,
  } = useCalendarPortalContext();
  const isModal = trigger !== 'hover';
  const [portalElement, setPortalElement] =
    React.useState<HTMLDivElement | null>(null);
  const handlePortalRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setPortalContentRef(node);
      setPortalElement(current => (current === node ? current : node));
    },
    [setPortalContentRef]
  );

  useCalendarModalIsolation({
    enabled: isModal && (isOpen || isClosing),
    portalElement,
  });

  if ((!isOpen && !isClosing) || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={handlePortalRef}
      id={portalId}
      tabIndex={-1}
      style={
        {
          ...portalStyle,
          '--calendar-portal-transition-duration': `${CALENDAR_CONSTANTS.PORTAL_TRANSITION_DURATION}ms`,
          pointerEvents: isPositionReady ? undefined : 'none',
          visibility: isPositionReady ? undefined : 'hidden',
        } as React.CSSProperties
      }
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
      aria-labelledby={portalTitleId}
      aria-modal={isModal ? true : undefined}
      role="dialog"
    >
      <span id={portalTitleId} className="sr-only">
        Pilih tanggal
      </span>
      {children}
    </div>,
    container ?? document.body
  );
};

export default CalendarPortal;
