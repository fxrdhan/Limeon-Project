import React, { useState, useRef, useCallback, useEffect } from "react";
import { DatepickerContext } from "./datepickerContext";
import { useDatepickerState } from "../hooks/useDatepickerState";
import { useDatepickerPosition } from "../hooks/useDatepickerPosition";
import { useDatepickerNavigation } from "../hooks/useDatepickerNavigation";
import { useDatepickerHover } from "../hooks/useDatepickerHover";
import { useDatepickerKeyboard } from "../hooks/useDatepickerKeyboard";
import type { DatepickerProviderProps, CalendarView } from "../types";

export const DatepickerProvider: React.FC<DatepickerProviderProps> = ({
  children,
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
}) => {
  // Refs
  const triggerInputRef = useRef<HTMLInputElement>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);

  // State
  const [displayDate, setDisplayDate] = useState(value || new Date());
  const [currentView, setCurrentView] = useState<CalendarView>("days");
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);
  const [highlightedMonth, setHighlightedMonth] = useState<number | null>(null);
  const [highlightedYear, setHighlightedYear] = useState<number | null>(null);

  // Custom hooks
  const { isOpen, isClosing, openCalendar, closeCalendar } = useDatepickerState({
    value,
    onOpen: () => {
      setDisplayDate(value || new Date());
      setCurrentView("days");
      setHighlightedDate(value || new Date());
      setHighlightedMonth(null);
      setHighlightedYear(null);
    },
    onClose: () => {
      setHighlightedDate(null);
      setHighlightedMonth(null);
      setHighlightedYear(null);
    },
  });

  const { portalStyle, isPositionReady, dropDirection, calculatePosition } = useDatepickerPosition({
    triggerRef: triggerInputRef,
    portalRef: portalContentRef,
    isOpen,
    portalWidth,
  });

  const { navigateViewDate, navigateYear } = useDatepickerNavigation({
    displayDate,
    currentView,
    setDisplayDate,
  });

  const focusPortal = useCallback(() => {
    setTimeout(() => {
      if (portalContentRef.current) {
        portalContentRef.current.focus();
      }
    }, 0);
  }, []);

  // Event handlers
  const handleDateSelect = useCallback((date: Date) => {
    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0
    );
    onChange(selectedDate);
    closeCalendar();

    setTimeout(() => {
      triggerInputRef.current?.focus();
    }, 250);
  }, [onChange, closeCalendar]);

  const handleMonthSelect = useCallback((selectedMonth: number) => {
    const currentDisplayYear = displayDate.getFullYear();
    const newDisplayDateForDaysView = new Date(
      currentDisplayYear,
      selectedMonth,
      1
    );

    setDisplayDate(newDisplayDateForDaysView);
    setCurrentView("days");

    let newHighlight: Date;
    if (
      value &&
      value.getFullYear() === currentDisplayYear &&
      value.getMonth() === selectedMonth
    ) {
      newHighlight = new Date(value);
    } else {
      newHighlight = new Date(currentDisplayYear, selectedMonth, 1);
    }
    setHighlightedDate(newHighlight);
    setHighlightedMonth(null);

    calculatePosition();
    focusPortal();
  }, [displayDate, value, calculatePosition, focusPortal]);

  const handleYearSelect = useCallback((selectedYear: number) => {
    setDisplayDate((prev) => {
      const newDate = new Date(prev);
      newDate.setFullYear(selectedYear);
      return newDate;
    });
    setCurrentView("months");
    setHighlightedYear(null);
    setHighlightedMonth(
      value && value.getFullYear() === selectedYear ? value.getMonth() : 0
    );
    calculatePosition();
    focusPortal();
  }, [value, calculatePosition, focusPortal]);

  const {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useDatepickerHover({
    openCalendar,
    closeCalendar,
    portalRef: portalContentRef,
  });

  const { handleInputKeyDown, handleCalendarKeyDown } = useDatepickerKeyboard({
    isOpen,
    currentView,
    highlightedDate,
    highlightedMonth,
    highlightedYear,
    displayDate,
    value,
    minDate,
    maxDate,
    onDateSelect: handleDateSelect,
    onMonthSelect: handleMonthSelect,
    onYearSelect: handleYearSelect,
    openCalendar,
    closeCalendar,
    setHighlightedDate,
    setHighlightedMonth,
    setHighlightedYear,
    setDisplayDate,
    setCurrentView,
    navigateViewDate,
    navigateYear,
    focusPortal,
  });

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        portalContentRef.current &&
        !portalContentRef.current.contains(event.target as Node) &&
        triggerInputRef.current &&
        !triggerInputRef.current.contains(event.target as Node)
      ) {
        closeCalendar();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeCalendar]);

  const contextValue = {
    // Core state
    value,
    onChange,

    // Calendar state
    isOpen,
    isClosing,
    isPositionReady,
    displayDate,
    currentView,
    dropDirection,

    // Highlighting state
    highlightedDate,
    highlightedMonth,
    highlightedYear,

    // Configuration
    minDate,
    maxDate,
    portalWidth,

    // Portal styling
    portalStyle,

    // Actions
    openCalendar,
    closeCalendar,
    setDisplayDate,
    setCurrentView,
    setHighlightedDate,
    setHighlightedMonth,
    setHighlightedYear,

    // Handlers
    handleDateSelect,
    handleMonthSelect,
    handleYearSelect,

    // Navigation
    navigateViewDate,
    navigateYear,

    // Refs
    triggerInputRef,
    portalContentRef,

    // Event handlers for components
    handleTriggerClick: () => {
      if (isOpen && !isClosing) {
        closeCalendar();
      } else {
        openCalendar();
      }
    },
    handleInputKeyDown,
    handleCalendarKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    
    // Position calculation
    calculatePosition,
  };

  return (
    <DatepickerContext.Provider value={contextValue}>
      {children}
    </DatepickerContext.Provider>
  );
};