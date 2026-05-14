import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCalendarAnimatedNavigation } from './useCalendarAnimatedNavigation';
import { useCalendarHeaderControls } from './useCalendarHeaderControls';
import { useCalendarNavigation } from './useCalendarNavigation';
import { useCalendarRootInteractions } from './useCalendarRootInteractions';
import { useCalendarSelection } from './useCalendarSelection';
import type {
  CalendarDateValue,
  CalendarProviderProps,
  CalendarTrigger,
} from '../types';

type UseCalendarRootActionsParams = {
  modeBehavior: {
    closeOnSelect: boolean;
    outsideClickEnabled: boolean;
    trapFocus: boolean;
    trigger: CalendarTrigger;
  };
  readOnly?: boolean;
  disabled?: boolean;
  selectedValue: CalendarDateValue;
  highlightedDate: Date | null;
  displayDate: Date;
  minDate?: Date;
  maxDate?: Date;
  isOpen: boolean;
  isClosing: boolean;
  onChange: CalendarProviderProps['onChange'];
  openCalendar: () => void;
  closeCalendar: () => void;
  setHighlightedDate: Dispatch<SetStateAction<Date | null>>;
  setDisplayDate: Dispatch<SetStateAction<Date>>;
  portalContentRef: RefObject<HTMLDivElement | null>;
  triggerInputRef: RefObject<HTMLElement | null>;
  focusPortal: () => void;
  focusTrigger: () => void;
  calculatePosition: () => void;
};

export const useCalendarRootActions = ({
  modeBehavior,
  readOnly,
  disabled,
  selectedValue,
  highlightedDate,
  displayDate,
  minDate,
  maxDate,
  isOpen,
  isClosing,
  onChange,
  openCalendar,
  closeCalendar,
  setHighlightedDate,
  setDisplayDate,
  portalContentRef,
  triggerInputRef,
  focusPortal,
  focusTrigger,
  calculatePosition,
}: UseCalendarRootActionsParams) => {
  const { closeCalendarAndRestoreFocus, handleDateSelect, handleDateClear } =
    useCalendarSelection({
      closeOnSelect: modeBehavior.closeOnSelect,
      readOnly,
      disabled,
      selectedValue,
      minDate,
      maxDate,
      isOpen,
      onChange,
      closeCalendar,
      focusTrigger,
    });

  const { navigateViewDate: navigateViewDateBase, navigateYear } =
    useCalendarNavigation({
      displayDate,
      setDisplayDate,
      minDate,
      maxDate,
    });
  const {
    navigationDirection,
    yearNavigationDirection,
    navigateViewDate,
    navigateYearWithAnimation,
    triggerMonthAnimation,
    triggerYearAnimation,
  } = useCalendarAnimatedNavigation({
    navigateViewDate: navigateViewDateBase,
    navigateYear,
  });

  const {
    handleMonthChange,
    handleNavigateNext,
    handleNavigatePrev,
    handleYearChange,
  } = useCalendarHeaderControls({
    displayDate,
    minDate,
    maxDate,
    setDisplayDate,
    navigateViewDate,
    triggerMonthAnimation,
    triggerYearAnimation,
    calculatePosition,
  });

  const {
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarRootInteractions({
    disabled,
    outsideClickEnabled: modeBehavior.outsideClickEnabled,
    trapFocus: modeBehavior.trapFocus,
    trigger: modeBehavior.trigger,
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
  });

  return {
    handleCalendarKeyDown,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    handleDateHighlight: setHighlightedDate,
    handleDateSelect,
    handleInputKeyDown,
    handleMonthChange,
    handleNavigateNext,
    handleNavigatePrev,
    handleTriggerClick,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleYearChange,
    navigationDirection,
    yearNavigationDirection,
  };
};
