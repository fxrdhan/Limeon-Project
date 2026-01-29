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
  trigger = mode === 'inline' ? 'hover' : 'click',
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
}) => {
  // Get size preset
  const sizeConfig = CALENDAR_SIZE_PRESETS[size];
  // Refs
  const triggerInputRef = useRef<HTMLInputElement | HTMLDivElement>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);

  // State
  const [displayDate, setDisplayDate] = useState(value || new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('days');
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null);
  const [highlightedMonth, setHighlightedMonth] = useState<number | null>(null);
  const [highlightedYear, setHighlightedYear] = useState<number | null>(null);
  const [navigationDirection, setNavigationDirection] = useState<
    'prev' | 'next' | null
  >(null);
  const [yearNavigationDirection, setYearNavigationDirection] = useState<
    'prev' | 'next' | null
  >(null);

  // Custom hooks
  const {
    isOpen,
    isClosing,
    isOpening,
    openCalendar,
    closeCalendar,
    setIsOpening,
  } = useCalendarState({
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
  });

  // For inline mode, calendar is always "open"
  const effectiveIsOpen = mode === 'inline' ? true : isOpen;
  const effectiveIsClosing = mode === 'inline' ? false : isClosing;
  const effectiveIsOpening = mode === 'inline' ? false : isOpening;

  const { portalStyle, isPositionReady, dropDirection, calculatePosition } =
    useCalendarPosition({
      triggerRef: triggerInputRef,
      portalRef: portalContentRef,
      isOpen,
      // Always pass portalWidth or fallback to size preset width
      portalWidth: portalWidth || sizeConfig.width,
      calendarWidth: sizeConfig.width,
      calendarHeight: sizeConfig.height,
    });

  const { navigateViewDate: originalNavigateViewDate, navigateYear } =
    useCalendarNavigation({
      displayDate,
      currentView,
      setDisplayDate,
    });

  // Wrapper for navigateViewDate to track direction
  const navigateViewDate = useCallback(
    (direction: 'prev' | 'next') => {
      setNavigationDirection(direction);
      originalNavigateViewDate(direction);

      // Clear direction after animation completes
      setTimeout(() => {
        setNavigationDirection(null);
      }, 300); // Match animation duration
    },
    [originalNavigateViewDate]
  );

  // Wrapper for year navigation to track vertical direction
  const navigateYearWithAnimation = useCallback(
    (direction: 'prev' | 'next') => {
      setYearNavigationDirection(direction);
      navigateYear(direction);

      // Clear direction after animation completes
      setTimeout(() => {
        setYearNavigationDirection(null);
      }, 300); // Match animation duration
    },
    [navigateYear]
  );

  // Function to trigger year animation direction without changing date
  const triggerYearAnimation = useCallback((direction: 'prev' | 'next') => {
    setYearNavigationDirection(direction);

    // Clear direction after animation completes
    setTimeout(() => {
      setYearNavigationDirection(null);
    }, 300); // Match animation duration
  }, []);

  // Function to trigger month animation direction without changing date
  const triggerMonthAnimation = useCallback((direction: 'prev' | 'next') => {
    setNavigationDirection(direction);

    // Clear direction after animation completes
    setTimeout(() => {
      setNavigationDirection(null);
    }, 300); // Match animation duration
  }, []);

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
      if (readOnly) return;
      const selectedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12,
        0,
        0
      );
      onChange(selectedDate);

      // Don't close calendar in inline mode
      if (mode !== 'inline') {
        closeCalendar();

        setTimeout(() => {
          triggerInputRef.current?.focus();
        }, 250);
      }
    },
    [onChange, closeCalendar, mode, readOnly]
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

      // Skip position calculation and focus for inline mode
      if (mode !== 'inline') {
        calculatePosition();
        focusPortal();
      }
    },
    [displayDate, value, calculatePosition, focusPortal, mode]
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

      // Skip position calculation and focus for inline mode
      if (mode !== 'inline') {
        calculatePosition();
        focusPortal();
      }
    },
    [value, calculatePosition, focusPortal, mode]
  );

  const openIfAllowed = useCallback(() => {
    openCalendar();
  }, [openCalendar]);

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
    navigateYearWithAnimation,
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

  // Click outside handler (skip for inline mode)
  useEffect(() => {
    if (mode === 'inline') return; // No click outside handling for inline mode

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
  }, [isOpen, closeCalendar, mode]);

  const contextValue = {
    // Core state
    value,
    onChange,

    // Calendar state
    isOpen: effectiveIsOpen,
    isClosing: effectiveIsClosing,
    isOpening: effectiveIsOpening,
    isPositionReady: mode === 'inline' ? true : isPositionReady,
    displayDate,
    currentView,
    dropDirection,
    navigationDirection,
    yearNavigationDirection,

    // Highlighting state
    highlightedDate,
    highlightedMonth,
    highlightedYear,

    // Configuration
    mode,
    size,
    trigger,
    minDate,
    maxDate,
    portalWidth,
    readOnly,

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
    navigateYearWithAnimation,
    triggerYearAnimation,
    triggerMonthAnimation,

    // Refs
    triggerInputRef,
    portalContentRef,

    // Event handlers for components
    handleTriggerClick: () => {
      if (isOpen && !isClosing) {
        closeCalendar();
      } else {
        openCalendar();
        // Ensure portal position is calculated immediately after opening via click
        calculatePosition();
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
