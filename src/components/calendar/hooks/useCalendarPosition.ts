import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from '@floating-ui/react-dom';
import { CALENDAR_CONSTANTS } from '../constants';
import type {
  UseCalendarPositionParams,
  UseCalendarPositionReturn,
} from '../types';

const calendarViewportPadding = CALENDAR_CONSTANTS.VIEWPORT_MARGIN;

const getPortalWidth = (
  portalWidth: string | number | undefined,
  calendarWidth: number
) => {
  if (typeof portalWidth === 'number') return `${portalWidth}px`;
  if (portalWidth) return portalWidth;
  return `${calendarWidth}px`;
};

const isPromiseLike = (
  value: void | PromiseLike<void>
): value is PromiseLike<void> =>
  typeof value === 'object' && value !== null && 'then' in value;

export const useCalendarPosition = (
  params: UseCalendarPositionParams
): UseCalendarPositionReturn => {
  const {
    triggerRef,
    portalRef,
    isOpen,
    portalWidth,
    calendarWidth = CALENDAR_CONSTANTS.CALENDAR_WIDTH,
  } = params;

  const [isPositionReady, setIsPositionReady] = useState(false);
  const floatingMiddleware = useMemo(
    () => [
      offset(CALENDAR_CONSTANTS.POSITION_MARGIN),
      flip({ padding: calendarViewportPadding }),
      shift({ padding: calendarViewportPadding }),
      size({
        padding: calendarViewportPadding,
        apply({ availableHeight, availableWidth, elements }) {
          elements.floating.style.setProperty(
            '--calendar-available-width',
            `${Math.max(0, availableWidth)}px`
          );
          elements.floating.style.setProperty(
            '--calendar-available-height',
            `${Math.max(0, availableHeight)}px`
          );
        },
      }),
    ],
    []
  );

  const {
    floatingStyles,
    placement,
    refs: { setFloating, setReference },
    update,
  } = useFloating<HTMLElement>({
    middleware: floatingMiddleware,
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
  });

  const setPortalContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      portalRef.current = node;
      setFloating(node);
    },
    [portalRef, setFloating]
  );

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !portalRef.current) return;

    setReference(triggerRef.current);
    const updateResult = update();
    if (isPromiseLike(updateResult)) {
      void updateResult.then(() => {
        setIsPositionReady(true);
      });
      return;
    }

    setIsPositionReady(true);
  }, [portalRef, setReference, triggerRef, update]);

  const updatePositionWhenReady = useCallback(
    (onReady: () => void) => {
      const updateResult = update();
      if (isPromiseLike(updateResult)) {
        void updateResult.then(onReady);
        return;
      }

      onReady();
    },
    [update]
  );

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setIsPositionReady(false);
      return;
    }

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      setIsPositionReady(false);
      setReference(triggerRef.current);
      updatePositionWhenReady(() => {
        if (!cancelled) {
          setIsPositionReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [isOpen, setReference, triggerRef, updatePositionWhenReady]);

  const portalStyle = useMemo<React.CSSProperties>(
    () => ({
      ...floatingStyles,
      maxHeight: 'var(--calendar-available-height)',
      maxWidth: 'var(--calendar-available-width)',
      outline: 'none',
      overflowY: 'auto',
      width: getPortalWidth(portalWidth, calendarWidth),
      zIndex: CALENDAR_CONSTANTS.PORTAL_Z_INDEX,
    }),
    [calendarWidth, floatingStyles, portalWidth]
  );

  return {
    portalStyle,
    isPositionReady,
    dropDirection: placement.startsWith('top') ? 'up' : 'down',
    setPortalContentRef,
    calculatePosition,
  };
};
