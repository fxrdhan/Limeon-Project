import * as React from 'react';
import { cn } from '@/lib/utils';
import { TooltipContext, TooltipProviderContext } from './context';
import type {
  TooltipContentConfig,
  TooltipContentProps,
  TooltipProps,
  TooltipTriggerProps,
} from './types';

export const Tooltip = ({
  children,
  className,
  side = 'top',
  sideOffset = 6,
  align = 'center',
  alignOffset = 0,
}: TooltipProps) => {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const contentRef = React.useRef<TooltipContentConfig | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openDelay, closeDelay, showTooltip, hideTooltip } = React.useContext(
    TooltipProviderContext
  );

  const clearTooltipTimeout = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openTooltip = React.useCallback(() => {
    const triggerElement = triggerRef.current;
    const content = contentRef.current;
    if (!triggerElement || !content) {
      return;
    }

    showTooltip({
      id,
      triggerElement,
      side,
      sideOffset,
      align,
      alignOffset,
      content,
    });
  }, [align, alignOffset, id, showTooltip, side, sideOffset]);

  const scheduleOpen = React.useCallback(() => {
    clearTooltipTimeout();

    if (openDelay === 0) {
      openTooltip();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      openTooltip();
      timeoutRef.current = null;
    }, openDelay);
  }, [clearTooltipTimeout, openDelay, openTooltip]);

  const scheduleClose = React.useCallback(() => {
    clearTooltipTimeout();

    if (closeDelay === 0) {
      hideTooltip(id);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      hideTooltip(id);
      timeoutRef.current = null;
    }, closeDelay);
  }, [clearTooltipTimeout, closeDelay, hideTooltip, id]);

  const setContent = React.useCallback((content: TooltipContentConfig) => {
    contentRef.current = content;
  }, []);

  React.useEffect(
    () => () => {
      clearTooltipTimeout();
      hideTooltip(id);
    },
    [clearTooltipTimeout, hideTooltip, id]
  );

  return (
    <TooltipContext.Provider value={{ setContent }}>
      <span
        ref={triggerRef}
        className={cn('relative inline-flex', className)}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
      >
        {children}
      </span>
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger = ({ children }: TooltipTriggerProps) => children;

export const TooltipContent = ({
  children,
  className,
  asChild: _asChild,
  layout = 'preserve-aspect',
  style,
}: TooltipContentProps) => {
  const tooltip = React.useContext(TooltipContext);

  tooltip?.setContent({
    children,
    className,
    layout,
    style,
  });

  return null;
};
