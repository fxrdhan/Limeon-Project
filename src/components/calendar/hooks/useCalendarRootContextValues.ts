import {
  useMemo,
  type CSSProperties,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import type {
  CalendarMode,
  CalendarRootContextState,
  CalendarSize,
  CalendarTrigger,
  CalendarDateValue,
} from '../types';

type CalendarNavigationDirection = 'prev' | 'next';

type UseCalendarRootContextValuesParams = {
  selectedValue: CalendarDateValue;
  displayDate: Date;
  navigationDirection: CalendarNavigationDirection | null;
  yearNavigationDirection: CalendarNavigationDirection | null;
  highlightedDate: Date | null;
  mode: CalendarMode;
  size: CalendarSize;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  setDisplayDate: Dispatch<SetStateAction<Date>>;
  setHighlightedDate: Dispatch<SetStateAction<Date | null>>;
  handleDateSelect: (date: Date) => void;
  navigateViewDate: (direction: CalendarNavigationDirection) => boolean;
  triggerYearAnimation: (direction: CalendarNavigationDirection) => void;
  triggerMonthAnimation: (direction: CalendarNavigationDirection) => void;
  portalContentRef: RefObject<HTMLDivElement | null>;
  getDayButtonId: (date: Date) => string;
  calculatePosition: () => void;
  trigger: CalendarTrigger;
  triggerInputRef: RefObject<HTMLElement | null>;
  effectiveIsOpen: boolean;
  triggerId: string;
  portalId: string;
  handleTriggerClick: () => void;
  handleInputKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  effectiveIsClosing: boolean;
  effectiveIsOpening: boolean;
  isPositionReady: boolean;
  dropDirection: 'down' | 'up';
  portalStyle: CSSProperties;
  setPortalContentRef: (node: HTMLDivElement | null) => void;
  portalTitleId: string;
  handleCalendarKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  handleCalendarMouseEnter: () => void;
  handleCalendarMouseLeave: () => void;
};

export const useCalendarRootContextValues = ({
  selectedValue,
  displayDate,
  navigationDirection,
  yearNavigationDirection,
  highlightedDate,
  mode,
  size,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
  setDisplayDate,
  setHighlightedDate,
  handleDateSelect,
  navigateViewDate,
  triggerYearAnimation,
  triggerMonthAnimation,
  portalContentRef,
  getDayButtonId,
  calculatePosition,
  trigger,
  triggerInputRef,
  effectiveIsOpen,
  triggerId,
  portalId,
  handleTriggerClick,
  handleInputKeyDown,
  handleTriggerMouseEnter,
  handleTriggerMouseLeave,
  effectiveIsClosing,
  effectiveIsOpening,
  isPositionReady,
  dropDirection,
  portalStyle,
  setPortalContentRef,
  portalTitleId,
  handleCalendarKeyDown,
  handleCalendarMouseEnter,
  handleCalendarMouseLeave,
}: UseCalendarRootContextValuesParams): CalendarRootContextState => {
  const contentContext = useMemo<CalendarRootContextState['content']>(
    () => ({
      value: selectedValue,
      displayDate,
      navigationDirection,
      yearNavigationDirection,
      highlightedDate,
      mode,
      size,
      minDate,
      maxDate,
      portalWidth,
      readOnly,
      setDisplayDate,
      setHighlightedDate,
      handleDateSelect,
      navigateViewDate,
      triggerYearAnimation,
      triggerMonthAnimation,
      portalContentRef,
      getDayButtonId,
      calculatePosition,
    }),
    [
      selectedValue,
      displayDate,
      navigationDirection,
      yearNavigationDirection,
      highlightedDate,
      mode,
      size,
      minDate,
      maxDate,
      portalWidth,
      readOnly,
      setDisplayDate,
      setHighlightedDate,
      handleDateSelect,
      navigateViewDate,
      triggerYearAnimation,
      triggerMonthAnimation,
      getDayButtonId,
      calculatePosition,
      portalContentRef,
    ]
  );

  const triggerContext = useMemo<CalendarRootContextState['trigger']>(
    () => ({
      trigger,
      triggerInputRef,
      isOpen: effectiveIsOpen,
      triggerId,
      portalId,
      handleTriggerClick,
      handleInputKeyDown,
      handleTriggerMouseEnter,
      handleTriggerMouseLeave,
    }),
    [
      trigger,
      triggerInputRef,
      effectiveIsOpen,
      triggerId,
      portalId,
      handleTriggerClick,
      handleInputKeyDown,
      handleTriggerMouseEnter,
      handleTriggerMouseLeave,
    ]
  );

  const portalContext = useMemo<CalendarRootContextState['portal']>(
    () => ({
      isOpen: effectiveIsOpen,
      isClosing: effectiveIsClosing,
      isOpening: effectiveIsOpening,
      isPositionReady,
      dropDirection,
      portalStyle,
      setPortalContentRef,
      portalId,
      portalTitleId,
      handleCalendarKeyDown,
      handleCalendarMouseEnter,
      handleCalendarMouseLeave,
      trigger,
    }),
    [
      effectiveIsOpen,
      effectiveIsClosing,
      effectiveIsOpening,
      isPositionReady,
      dropDirection,
      portalStyle,
      setPortalContentRef,
      portalId,
      portalTitleId,
      handleCalendarKeyDown,
      handleCalendarMouseEnter,
      handleCalendarMouseLeave,
      trigger,
    ]
  );

  return useMemo<CalendarRootContextState>(
    () => ({
      content: contentContext,
      trigger: triggerContext,
      portal: portalContext,
    }),
    [contentContext, triggerContext, portalContext]
  );
};
