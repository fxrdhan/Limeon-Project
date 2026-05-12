import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CALENDAR_SIZE_PRESETS } from './constants';
import {
  useCalendarHover,
  useCalendarKeyboard,
  useCalendarNavigation,
  useCalendarPosition,
  useCalendarState,
} from './hooks';
import type {
  CalendarContextState,
  CalendarProviderProps,
  CalendarView,
} from './types';

export type CalendarRootProps = CalendarProviderProps;

export function useCalendarRootState({
  mode = 'datepicker',
  size = 'md',
  trigger = mode === 'inline' ? 'hover' : 'click',
  value,
  onChange,
  minDate,
  maxDate,
  portalWidth,
  readOnly,
}: Omit<CalendarRootProps, 'children'>): CalendarContextState {
  const sizeConfig = CALENDAR_SIZE_PRESETS[size];
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const portalId = `${reactId}-portal`;
  const valueTime = value?.getTime() ?? null;
  const selectedValue = useMemo(
    () => (valueTime === null ? null : new Date(valueTime)),
    [valueTime]
  );
  const triggerInputRef = useRef<HTMLInputElement | HTMLDivElement>(null);
  const portalContentRef = useRef<HTMLDivElement>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const yearNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const focusPortalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const returnFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [displayDate, setDisplayDate] = useState(selectedValue || new Date());
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

  const {
    isOpen,
    isClosing,
    isOpening,
    openCalendar,
    closeCalendar,
    setIsOpening,
  } = useCalendarState({
    value: selectedValue,
    mode,
    onOpen: () => {
      const nextDisplayDate = selectedValue || new Date();
      setDisplayDate(nextDisplayDate);
      setCurrentView('days');
      setHighlightedDate(nextDisplayDate);
      setHighlightedMonth(null);
      setHighlightedYear(null);
    },
    onClose: () => {
      setHighlightedDate(null);
      setHighlightedMonth(null);
      setHighlightedYear(null);
    },
  });

  const effectiveIsOpen = mode === 'inline' ? true : isOpen;
  const effectiveIsClosing = mode === 'inline' ? false : isClosing;
  const effectiveIsOpening = mode === 'inline' ? false : isOpening;

  const {
    portalStyle,
    isPositionReady,
    dropDirection,
    setPortalContentRef,
    calculatePosition,
  } = useCalendarPosition({
    triggerRef: triggerInputRef,
    portalRef: portalContentRef,
    isOpen,
    portalWidth: portalWidth || sizeConfig.width,
    calendarWidth: sizeConfig.width,
  });

  const { navigateViewDate: originalNavigateViewDate, navigateYear } =
    useCalendarNavigation({
      displayDate,
      currentView,
      setDisplayDate,
    });

  const navigateViewDate = useCallback(
    (direction: 'prev' | 'next') => {
      setNavigationDirection(direction);
      originalNavigateViewDate(direction);

      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      navigationTimeoutRef.current = setTimeout(() => {
        setNavigationDirection(null);
      }, 300);
    },
    [originalNavigateViewDate]
  );

  const navigateYearWithAnimation = useCallback(
    (direction: 'prev' | 'next') => {
      setYearNavigationDirection(direction);
      navigateYear(direction);

      if (yearNavigationTimeoutRef.current) {
        clearTimeout(yearNavigationTimeoutRef.current);
      }

      yearNavigationTimeoutRef.current = setTimeout(() => {
        setYearNavigationDirection(null);
      }, 300);
    },
    [navigateYear]
  );

  const triggerYearAnimation = useCallback((direction: 'prev' | 'next') => {
    setYearNavigationDirection(direction);

    if (yearNavigationTimeoutRef.current) {
      clearTimeout(yearNavigationTimeoutRef.current);
    }

    yearNavigationTimeoutRef.current = setTimeout(() => {
      setYearNavigationDirection(null);
    }, 300);
  }, []);

  const triggerMonthAnimation = useCallback((direction: 'prev' | 'next') => {
    setNavigationDirection(direction);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      setNavigationDirection(null);
    }, 300);
  }, []);

  const focusPortal = useCallback(() => {
    if (focusPortalTimeoutRef.current) {
      clearTimeout(focusPortalTimeoutRef.current);
    }

    focusPortalTimeoutRef.current = setTimeout(() => {
      if (portalContentRef.current) {
        portalContentRef.current.focus();
      }
    }, 0);
  }, []);

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

      if (mode !== 'inline') {
        closeCalendar();

        if (returnFocusTimeoutRef.current) {
          clearTimeout(returnFocusTimeoutRef.current);
        }

        returnFocusTimeoutRef.current = setTimeout(() => {
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
        selectedValue &&
        selectedValue.getFullYear() === currentDisplayYear &&
        selectedValue.getMonth() === selectedMonth
      ) {
        newHighlight = new Date(selectedValue);
      } else {
        newHighlight = new Date(currentDisplayYear, selectedMonth, 1);
      }
      setHighlightedDate(newHighlight);
      setHighlightedMonth(null);

      if (mode !== 'inline') {
        calculatePosition();
        focusPortal();
      }
    },
    [displayDate, selectedValue, calculatePosition, focusPortal, mode]
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
        selectedValue && selectedValue.getFullYear() === selectedYear
          ? selectedValue.getMonth()
          : 0
      );

      if (mode !== 'inline') {
        calculatePosition();
        focusPortal();
      }
    },
    [selectedValue, calculatePosition, focusPortal, mode]
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
    value: selectedValue,
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

  useEffect(() => {
    if (isOpen && isPositionReady && isOpening) {
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isPositionReady, isOpening, setIsOpening]);

  useLayoutEffect(() => {
    if (isOpen && mode !== 'inline') return;

    setDisplayDate(selectedValue || new Date());
  }, [isOpen, mode, selectedValue]);

  useEffect(() => {
    if (mode === 'inline') return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (portalContentRef.current?.contains(target)) return;
      if (triggerInputRef.current?.contains(target)) return;

      if (!(target instanceof Element)) {
        if (isOpen) {
          closeCalendar();
        }
        return;
      }

      const dropdownMenu = target.closest(
        '[role="menu"], [data-combobox-popup]'
      );
      if (dropdownMenu) return;

      if (
        target.getAttribute('role') === 'menu' ||
        target.hasAttribute('data-combobox-popup')
      ) {
        return;
      }

      if (isOpen) {
        closeCalendar();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeCalendar, mode]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (yearNavigationTimeoutRef.current) {
        clearTimeout(yearNavigationTimeoutRef.current);
      }
      if (focusPortalTimeoutRef.current) {
        clearTimeout(focusPortalTimeoutRef.current);
      }
      if (returnFocusTimeoutRef.current) {
        clearTimeout(returnFocusTimeoutRef.current);
      }
    };
  }, []);

  return {
    value: selectedValue,
    onChange,
    isOpen: effectiveIsOpen,
    isClosing: effectiveIsClosing,
    isOpening: effectiveIsOpening,
    isPositionReady: mode === 'inline' ? true : isPositionReady,
    displayDate,
    currentView,
    dropDirection,
    navigationDirection,
    yearNavigationDirection,
    highlightedDate,
    highlightedMonth,
    highlightedYear,
    mode,
    size,
    trigger,
    minDate,
    maxDate,
    portalWidth,
    readOnly,
    portalStyle,
    openCalendar,
    closeCalendar,
    setDisplayDate,
    setCurrentView,
    setHighlightedDate,
    setHighlightedMonth,
    setHighlightedYear,
    handleDateSelect,
    handleMonthSelect,
    handleYearSelect,
    navigateViewDate,
    navigateYear,
    navigateYearWithAnimation,
    triggerYearAnimation,
    triggerMonthAnimation,
    triggerInputRef,
    portalContentRef,
    setPortalContentRef,
    triggerId,
    portalId,
    handleTriggerClick: () => {
      if (isOpen && !isClosing) {
        closeCalendar();
      } else {
        openCalendar();
        calculatePosition();
      }
    },
    handleInputKeyDown,
    handleCalendarKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    handleCalendarMouseEnter,
    handleCalendarMouseLeave,
    calculatePosition,
  };
}
