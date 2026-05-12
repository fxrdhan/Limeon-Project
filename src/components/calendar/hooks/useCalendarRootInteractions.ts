import {
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { useCalendarHover } from './useCalendarHover';
import { useCalendarKeyboard } from './useCalendarKeyboard';
import { useCalendarOutsideClick } from './useCalendarOutsideClick';
import type { CalendarDateValue, CalendarTrigger } from '../types';

type CalendarNavigationDirection = 'prev' | 'next';

type UseCalendarRootInteractionsParams = {
  disabled?: boolean;
  outsideClickEnabled: boolean;
  trapFocus: boolean;
  trigger: CalendarTrigger;
  portalContentRef: RefObject<HTMLDivElement | null>;
  triggerInputRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  isClosing: boolean;
  highlightedDate: Date | null;
  displayDate: Date;
  selectedValue: CalendarDateValue;
  minDate?: Date;
  maxDate?: Date;
  handleDateSelect: (date: Date) => void;
  handleDateClear: () => void;
  openCalendar: () => void;
  closeCalendar: () => void;
  closeCalendarAndRestoreFocus: () => void;
  setHighlightedDate: Dispatch<SetStateAction<Date | null>>;
  setDisplayDate: Dispatch<SetStateAction<Date>>;
  navigateViewDate: (direction: CalendarNavigationDirection) => boolean;
  navigateYearWithAnimation: (
    direction: CalendarNavigationDirection
  ) => boolean;
  focusPortal: () => void;
  focusTrigger: () => void;
  calculatePosition: () => void;
};

export const useCalendarRootInteractions = ({
  disabled,
  outsideClickEnabled,
  trapFocus,
  trigger,
  portalContentRef,
  triggerInputRef,
  isOpen,
  isClosing,
  highlightedDate,
  displayDate,
  selectedValue,
  minDate,
  maxDate,
  handleDateSelect,
  handleDateClear,
  openCalendar,
  closeCalendar,
  closeCalendarAndRestoreFocus,
  setHighlightedDate,
  setDisplayDate,
  navigateViewDate,
  navigateYearWithAnimation,
  focusPortal,
  focusTrigger,
  calculatePosition,
}: UseCalendarRootInteractionsParams) => {
  const openIfAllowed = useCallback(() => {
    if (disabled) return;

    openCalendar();
  }, [disabled, openCalendar]);

  const closeIfAllowed = useCallback(() => {
    closeCalendar();
  }, [closeCalendar]);

  const {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarHover({
    openCalendar: openIfAllowed,
    closeCalendar: closeIfAllowed,
    portalRef: portalContentRef,
  });

  const { handleInputKeyDown, handleCalendarKeyDown } = useCalendarKeyboard({
    isOpen,
    disabled,
    highlightedDate,
    displayDate,
    value: selectedValue,
    minDate,
    maxDate,
    onDateSelect: handleDateSelect,
    onDateClear: handleDateClear,
    openCalendar: openIfAllowed,
    closeCalendar,
    closeCalendarAndRestoreFocus,
    setHighlightedDate,
    setDisplayDate,
    navigateViewDate,
    navigateYearWithAnimation,
    focusPortal,
    calculatePosition,
    trapFocus,
  });

  useCalendarOutsideClick({
    enabled: outsideClickEnabled,
    isOpen,
    trigger,
    portalContentRef,
    triggerInputRef,
    closeCalendar,
    focusTrigger,
  });

  const handleTriggerClick = useCallback(() => {
    if (disabled) return;

    if (isOpen && !isClosing) {
      closeCalendar();
      return;
    }

    openCalendar();
    calculatePosition();
    focusPortal();
  }, [
    calculatePosition,
    closeCalendar,
    disabled,
    focusPortal,
    isClosing,
    isOpen,
    openCalendar,
  ]);

  return {
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  };
};
