import {
  useMemo,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type {
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
  isInline: boolean;
  size: CalendarSize;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
  gridTabIndex: number;
  handleDateSelect: (date: Date) => void;
  handleDateHighlight: (date: Date | null) => void;
  handleNavigatePrev: () => void;
  handleNavigateNext: () => void;
  handleMonthChange: (month: number) => void;
  handleYearChange: (year: number) => void;
  portalContentRef: RefObject<HTMLDivElement | null>;
  getDayButtonId: (date: Date) => string;
  trigger: CalendarTrigger;
  triggerInputRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  triggerId: string;
  portalId: string;
  handleTriggerClick: () => void;
  handleInputKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  isClosing: boolean;
  isOpening: boolean;
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
  isInline,
  size,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
  disabled,
  gridTabIndex,
  handleDateSelect,
  handleDateHighlight,
  handleNavigatePrev,
  handleNavigateNext,
  handleMonthChange,
  handleYearChange,
  portalContentRef,
  getDayButtonId,
  trigger,
  triggerInputRef,
  isOpen,
  triggerId,
  portalId,
  handleTriggerClick,
  handleInputKeyDown,
  handleTriggerMouseEnter,
  handleTriggerMouseLeave,
  isClosing,
  isOpening,
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
      actions: {
        handleDateHighlight,
        handleDateSelect,
        handleMonthChange,
        handleNavigateNext,
        handleNavigatePrev,
        handleYearChange,
      },
      bounds: {
        maxDate,
        minDate,
      },
      interaction: {
        disabled,
        readOnly,
      },
      portal: {
        getDayButtonId,
        portalContentRef,
        portalWidth,
      },
      view: {
        displayDate,
        gridTabIndex,
        highlightedDate,
        isInline,
        navigationDirection,
        size,
        value: selectedValue,
        yearNavigationDirection,
      },
    }),
    [
      selectedValue,
      displayDate,
      navigationDirection,
      yearNavigationDirection,
      highlightedDate,
      isInline,
      size,
      minDate,
      maxDate,
      portalWidth,
      readOnly,
      disabled,
      gridTabIndex,
      handleDateSelect,
      handleDateHighlight,
      handleNavigatePrev,
      handleNavigateNext,
      handleMonthChange,
      handleYearChange,
      getDayButtonId,
      portalContentRef,
    ]
  );

  const triggerContext = useMemo<CalendarRootContextState['trigger']>(
    () => ({
      trigger,
      disabled,
      triggerInputRef,
      isOpen,
      triggerId,
      portalId,
      handleTriggerClick,
      handleInputKeyDown,
      handleTriggerMouseEnter,
      handleTriggerMouseLeave,
    }),
    [
      trigger,
      disabled,
      triggerInputRef,
      isOpen,
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
      isOpen,
      isClosing,
      isOpening,
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
      isOpen,
      isClosing,
      isOpening,
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
