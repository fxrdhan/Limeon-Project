import { useMemo } from 'react';
import type { CalendarMode, CalendarTrigger } from '../types';

type UseCalendarModeBehaviorParams = {
  mode: CalendarMode;
  trigger?: CalendarTrigger;
  disabled?: boolean;
  isOpen: boolean;
  isClosing: boolean;
  isOpening: boolean;
  isPositionReady: boolean;
};

export const useCalendarModeBehavior = ({
  mode,
  trigger,
  disabled,
  isOpen,
  isClosing,
  isOpening,
  isPositionReady,
}: UseCalendarModeBehaviorParams) =>
  useMemo(() => {
    const isInline = mode === 'inline';

    return {
      closeOnSelect: !isInline,
      gridTabIndex: isInline && !disabled ? 0 : -1,
      isClosing: isInline ? false : isClosing,
      isInline,
      isOpening: isInline ? false : isOpening,
      isOpen: isInline ? true : isOpen,
      isPositionReady: isInline ? true : isPositionReady,
      outsideClickEnabled: !isInline,
      trapFocus: !isInline,
      trigger: trigger ?? (isInline ? 'hover' : 'click'),
    };
  }, [disabled, isClosing, isOpening, isOpen, isPositionReady, mode, trigger]);
