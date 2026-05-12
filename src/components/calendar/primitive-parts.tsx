import React from 'react';
import {
  CalendarContentContext,
  CalendarPortalContext,
  CalendarTriggerContext,
} from './providers/calendarContext';
import { useCalendarTriggerContext } from './hooks';
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
    <CalendarContentContext.Provider value={context.content}>
      <CalendarTriggerContext.Provider value={context.trigger}>
        <CalendarPortalContext.Provider value={context.portal}>
          {children}
        </CalendarPortalContext.Provider>
      </CalendarTriggerContext.Provider>
    </CalendarContentContext.Provider>
  );
}

const assignRef = <T,>(ref: React.Ref<T> | undefined, value: T | null) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  ref.current = value;
};

const mergeRefs =
  <T,>(...refs: Array<React.Ref<T> | undefined>) =>
  (value: T | null) => {
    refs.forEach(ref => assignRef(ref, value));
  };

type TriggerChildProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
  type?: string;
  disabled?: boolean;
};

export function CalendarTrigger({
  children,
  className = 'calendar__custom-trigger',
  id,
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
    isOpen,
    disabled,
    triggerId,
    portalId,
  } = useCalendarTriggerContext();

  const getTriggerAttributes = (effectiveTriggerId: string) => ({
    id: effectiveTriggerId,
    'aria-controls': isOpen ? portalId : undefined,
    'aria-disabled': disabled ? true : undefined,
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog' as const,
  });

  if (React.isValidElement<TriggerChildProps>(children)) {
    const childProps = children.props;
    const isNativeButton = children.type === 'button';
    const isTriggerDisabled = Boolean(disabled || childProps.disabled);
    const triggerAttributes = getTriggerAttributes(
      id ?? childProps.id ?? triggerId
    );

    return React.cloneElement(children, {
      ...props,
      ...triggerAttributes,
      ref: mergeRefs(childProps.ref, triggerInputRef),
      className: [childProps.className, className].filter(Boolean).join(' '),
      onClick: event => {
        if (isTriggerDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        childProps.onClick?.(event);
        onClick?.(event as React.MouseEvent<HTMLDivElement>);
        if (!event.defaultPrevented && trigger === 'click') {
          handleTriggerClick();
        }
      },
      onMouseEnter: event => {
        if (isTriggerDisabled) return;
        childProps.onMouseEnter?.(event);
        onMouseEnter?.(event as React.MouseEvent<HTMLDivElement>);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseEnter();
        }
      },
      onMouseLeave: event => {
        if (isTriggerDisabled) return;
        childProps.onMouseLeave?.(event);
        onMouseLeave?.(event as React.MouseEvent<HTMLDivElement>);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseLeave();
        }
      },
      onKeyDown: event => {
        if (isTriggerDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        childProps.onKeyDown?.(event);
        onKeyDown?.(event as React.KeyboardEvent<HTMLDivElement>);
        if (!event.defaultPrevented) {
          handleInputKeyDown(event);
        }
      },
      ...(isNativeButton
        ? { type: childProps.type ?? 'button', disabled: isTriggerDisabled }
        : { role: 'button', tabIndex: isTriggerDisabled ? -1 : tabIndex }),
    });
  }

  return (
    <div
      {...props}
      {...getTriggerAttributes(id ?? triggerId)}
      ref={triggerInputRef as React.RefObject<HTMLDivElement | null>}
      onClick={event => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
        if (!event.defaultPrevented && trigger === 'click') {
          handleTriggerClick();
        }
      }}
      onMouseEnter={event => {
        if (disabled) return;
        onMouseEnter?.(event);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseEnter();
        }
      }}
      onMouseLeave={event => {
        if (disabled) return;
        onMouseLeave?.(event);
        if (!event.defaultPrevented && trigger === 'hover') {
          handleTriggerMouseLeave();
        }
      }}
      onKeyDown={event => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onKeyDown?.(event);
        if (!event.defaultPrevented) {
          handleInputKeyDown(event);
        }
      }}
      tabIndex={disabled ? -1 : tabIndex}
      role="button"
      className={className}
    >
      {children}
    </div>
  );
}
