import React from 'react';
import { CalendarContext } from './providers/calendarContext';
import { useCalendarContext } from './hooks';
import {
  type CalendarRootProps,
  useCalendarRootState,
} from './primitive-root-state';

export type { CalendarRootProps } from './primitive-root-state';

type CalendarTriggerProps = Omit<
  React.ComponentPropsWithoutRef<'div'>,
  'children' | 'role'
> & {
  children: React.ReactNode;
};

export function CalendarRoot({ children, ...props }: CalendarRootProps) {
  const context = useCalendarRootState(props);

  return (
    <CalendarContext.Provider value={context}>
      {children}
    </CalendarContext.Provider>
  );
}

export function CalendarTrigger({
  children,
  className = 'calendar__custom-trigger',
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  tabIndex = 0,
  ...props
}: CalendarTriggerProps) {
  const {
    trigger,
    triggerInputRef,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
  } = useCalendarContext();

  return (
    <div
      {...props}
      ref={triggerInputRef as React.RefObject<HTMLDivElement>}
      onClick={event => {
        onClick?.(event);
        if (!event.defaultPrevented && trigger === 'click') {
          handleTriggerClick();
        }
      }}
      onMouseEnter={event => {
        onMouseEnter?.(event);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseEnter();
        }
      }}
      onMouseLeave={event => {
        onMouseLeave?.(event);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseLeave();
        }
      }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) {
          handleInputKeyDown(event);
        }
      }}
      tabIndex={tabIndex}
      role="button"
      className={className}
    >
      {children}
    </div>
  );
}
