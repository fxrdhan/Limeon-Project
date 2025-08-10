import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CalendarContext } from './calendarContext';
import { useCalendarState } from '../hooks/useCalendarState';
import { useCalendarPosition } from '../hooks/useCalendarPosition';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import { useCalendarHover } from '../hooks/useCalendarHover';
import { useCalendarKeyboard } from '../hooks/useCalendarKeyboard';
import { CALENDAR_SIZE_PRESETS } from '../constants';
import type { CalendarProviderProps, CalendarView } from '../types';

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  mode = 'datepicker',
  size = 'md',
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
  resizable = false,
}) => {
  // Get size preset
  const sizeConfig = CALENDAR_SIZE_PRESETS[size];
  // Refs
  const triggerInputRef = useRef<HTMLInputElement>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);

  // State
  const [displayDate, setDisplayDate] = useState(value || new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('days');
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);
  const [highlightedMonth, setHighlightedMonth] = useState<number | null>(null);
  const [highlightedYear, setHighlightedYear] = useState<number | null>(null);
  const [currentWidth] = useState(sizeConfig.width);
  const [currentHeight] = useState(sizeConfig.height);

  // Custom hooks
  const { isOpen, isClosing, isOpening, openCalendar, closeCalendar, setIsOpening } = useCalendarState(
    {
      value,
      mode,
      onOpen: () => {
        setDisplayDate(value || new Date());
        setCurrentView('days');
        setHighlightedDate(value || new Date());
        setHighlightedMonth(null);
        setHighlightedYear(null);
      },
      onClose: () => {
        setHighlightedDate(null);
        setHighlightedMonth(null);
        setHighlightedYear(null);
      },
    }
  );

  const { portalStyle, isPositionReady, dropDirection, calculatePosition } =
    useCalendarPosition({
      triggerRef: triggerInputRef,
      portalRef: portalContentRef,
      isOpen,
      portalWidth,
      currentWidth,
      currentHeight,
      resizable,
    });

  const { navigateViewDate, navigateYear } = useCalendarNavigation({
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
  const handleDateSelect = useCallback(
    (date: Date) => {
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
    },
    [onChange, closeCalendar]
  );

  const handleMonthSelect = useCallback(
    (selectedMonth: number) => {
      const currentDisplayYear = displayDate.getFullYear();
      const newDisplayDateForDaysView = new Date(
        currentDisplayYear,
        selectedMonth,
        1
      );

      setDisplayDate(newDisplayDateForDaysView);
      setCurrentView('days');

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
    },
    [displayDate, value, calculatePosition, focusPortal]
  );

  const handleYearSelect = useCallback(
    (selectedYear: number) => {
      setDisplayDate(prev => {
        const newDate = new Date(prev);
        newDate.setFullYear(selectedYear);
        return newDate;
      });
      setCurrentView('months');
      setHighlightedYear(null);
      setHighlightedMonth(
        value && value.getFullYear() === selectedYear ? value.getMonth() : 0
      );
      calculatePosition();
      focusPortal();
    },
    [value, calculatePosition, focusPortal]
  );

  const {
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
  } = useCalendarHover({
    openCalendar,
    closeCalendar,
    portalRef: portalContentRef,
  });

  const { handleInputKeyDown, handleCalendarKeyDown } = useCalendarKeyboard({
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

  // Start animation timer only after portal is ready
  useEffect(() => {
    if (isOpen && isPositionReady && isOpening) {
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, 150); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isPositionReady, isOpening, setIsOpening]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside calendar portal
      if (portalContentRef.current?.contains(target)) return;
      
      // Check if click is inside trigger input
      if (triggerInputRef.current?.contains(target)) return;
      
      // Check if click is inside dropdown menu (calendar header dropdowns)
      const dropdownMenu = (target as Element).closest('[role="menu"]');
      if (dropdownMenu) return;
      
      // Check if target itself is a dropdown menu
      if ((target as Element).getAttribute?.('role') === 'menu') return;
      
      // If none of the above, close calendar
      if (isOpen) {
        closeCalendar();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeCalendar]);

  const contextValue = {
    // Core state
    value,
    onChange,

    // Calendar state
    isOpen,
    isClosing,
    isOpening,
    isPositionReady,
    displayDate,
    currentView,
    dropDirection,

    // Highlighting state
    highlightedDate,
    highlightedMonth,
    highlightedYear,

    // Configuration
    mode,
    size,
    minDate,
    maxDate,
    portalWidth,
    resizable,
    currentWidth,
    currentHeight,
    minWidth: sizeConfig.minWidth,
    minHeight: sizeConfig.minHeight,
    maxWidth: sizeConfig.maxWidth,
    maxHeight: sizeConfig.maxHeight,

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
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
};

// Backward compatibility alias
export const DatepickerProvider = CalendarProvider;
