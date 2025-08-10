import React from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { useCalendarContext } from '../hooks';
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
    resizable,
    currentWidth,
    currentHeight,
    minWidth,
    minHeight,
    mode,
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
        width: resizable ? `${currentWidth}px` : undefined,
        height: resizable ? `${currentHeight}px` : undefined,
        resize: resizable ? 'both' : 'none',
        overflow: resizable ? 'auto' : 'visible',
      }}
      className={classNames(
        'bg-white shadow-lg rounded-xl border border-gray-200 p-4',
        !resizable && `w-[${currentWidth}px]`,
        resizable && `min-w-[${minWidth}px] min-h-[${minHeight}px]`,
        mode === 'calendar' && 'relative',
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
