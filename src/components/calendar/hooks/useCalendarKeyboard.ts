import { useCallback } from 'react';
import { getYearsToDisplay } from '../constants';
import type {
  UseCalendarKeyboardParams,
  UseCalendarKeyboardReturn,
} from '../types';

export const useCalendarKeyboard = (
  params: UseCalendarKeyboardParams
): UseCalendarKeyboardReturn => {
  const {
    isOpen,
    currentView,
    highlightedDate,
    highlightedMonth,
    highlightedYear,
    displayDate,
    value,
    minDate,
    maxDate,
    onDateSelect,
    onMonthSelect,
    onYearSelect,
    openCalendar,
    closeCalendar,
    setHighlightedDate,
    setHighlightedMonth,
    setHighlightedYear,
    setDisplayDate,
    setCurrentView,
    navigateViewDate,
    navigateYearWithAnimation,
    focusPortal,
  } = params;

  const handleDaysNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const currentHighlight = highlightedDate || value || new Date();
      const newHighlight = new Date(currentHighlight);
      let navigated = false;

      switch (e.key) {
        case 'ArrowLeft':
          newHighlight.setDate(newHighlight.getDate() - 1);
          navigated = true;
          break;
        case 'ArrowRight':
          newHighlight.setDate(newHighlight.getDate() + 1);
          navigated = true;
          break;
        case 'ArrowUp':
          newHighlight.setDate(newHighlight.getDate() - 7);
          navigated = true;
          break;
        case 'ArrowDown':
          newHighlight.setDate(newHighlight.getDate() + 7);
          navigated = true;
          break;
      }

      if (navigated) {
        e.preventDefault();
        let isValidDate = true;
        if (minDate) {
          const min = new Date(minDate);
          min.setHours(0, 0, 0, 0);
          if (newHighlight < min) isValidDate = false;
        }
        if (maxDate) {
          const max = new Date(maxDate);
          max.setHours(0, 0, 0, 0);
          if (newHighlight > max) isValidDate = false;
        }

        if (isValidDate) {
          setHighlightedDate(newHighlight);
          if (
            newHighlight.getMonth() !== displayDate.getMonth() ||
            newHighlight.getFullYear() !== displayDate.getFullYear()
          ) {
            setDisplayDate(
              new Date(newHighlight.getFullYear(), newHighlight.getMonth(), 1)
            );
          }
        }
      }
    },
    [
      highlightedDate,
      value,
      minDate,
      maxDate,
      setHighlightedDate,
      setDisplayDate,
      displayDate,
    ]
  );

  const handleMonthsNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const currentHighlight =
        highlightedMonth ?? (value ? value.getMonth() : 0);
      let newHighlight = currentHighlight;
      let navigated = false;

      switch (e.key) {
        case 'ArrowLeft':
          newHighlight = Math.max(0, currentHighlight - 1);
          navigated = true;
          break;
        case 'ArrowRight':
          newHighlight = Math.min(11, currentHighlight + 1);
          navigated = true;
          break;
        case 'ArrowUp':
          newHighlight = Math.max(0, currentHighlight - 3);
          navigated = true;
          break;
        case 'ArrowDown':
          newHighlight = Math.min(11, currentHighlight + 3);
          navigated = true;
          break;
      }

      if (navigated) {
        e.preventDefault();
        const currentYear = displayDate.getFullYear();
        let isValidMonth = true;
        if (minDate) {
          const minD = new Date(minDate);
          const lastDayOfMonth = new Date(currentYear, newHighlight + 1, 0);
          if (lastDayOfMonth < minD) isValidMonth = false;
        }
        if (maxDate) {
          const maxD = new Date(maxDate);
          const firstDayOfMonth = new Date(currentYear, newHighlight, 1);
          if (firstDayOfMonth > maxD) isValidMonth = false;
        }

        if (isValidMonth) {
          setHighlightedMonth(newHighlight);
        }
      }
    },
    [
      highlightedMonth,
      value,
      displayDate,
      minDate,
      maxDate,
      setHighlightedMonth,
    ]
  );

  const handleYearsNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const yearsToDisplay = getYearsToDisplay(displayDate.getFullYear());
      const currentHighlight =
        highlightedYear ?? (value ? value.getFullYear() : yearsToDisplay[5]);
      const currentIndex = yearsToDisplay.indexOf(currentHighlight);
      let newIndex = currentIndex;
      let navigated = false;

      switch (e.key) {
        case 'ArrowLeft':
          newIndex = Math.max(0, currentIndex - 1);
          navigated = true;
          break;
        case 'ArrowRight':
          newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 1);
          navigated = true;
          break;
        case 'ArrowUp':
          newIndex = Math.max(0, currentIndex - 3);
          navigated = true;
          break;
        case 'ArrowDown':
          newIndex = Math.min(yearsToDisplay.length - 1, currentIndex + 3);
          navigated = true;
          break;
      }

      if (navigated) {
        e.preventDefault();
        const newYear = yearsToDisplay[newIndex];
        let isValidYear = true;
        if (minDate && newYear < new Date(minDate).getFullYear())
          isValidYear = false;
        if (maxDate && newYear > new Date(maxDate).getFullYear())
          isValidYear = false;

        if (isValidYear) {
          setHighlightedYear(newYear);
        }
      }
    },
    [highlightedYear, value, displayDate, minDate, maxDate, setHighlightedYear]
  );

  const handleViewNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && currentView === 'days') {
        let navigated = false;
        switch (e.key) {
          case 'ArrowLeft':
            navigateViewDate('prev');
            navigated = true;
            break;
          case 'ArrowRight':
            navigateViewDate('next');
            navigated = true;
            break;
          case 'ArrowUp':
            navigateYearWithAnimation('prev');
            navigated = true;
            break;
          case 'ArrowDown':
            navigateYearWithAnimation('next');
            navigated = true;
            break;
        }
        if (navigated) {
          e.preventDefault();
          return;
        }
      }

      if (currentView === 'days' && !e.ctrlKey) {
        handleDaysNavigation(e);
      } else if (currentView === 'months') {
        handleMonthsNavigation(e);
      } else if (currentView === 'years') {
        handleYearsNavigation(e);
      }
    },
    [
      currentView,
      navigateViewDate,
      navigateYearWithAnimation,
      handleDaysNavigation,
      handleMonthsNavigation,
      handleYearsNavigation,
    ]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>) => {
      if (e.key === 'Tab' && isOpen) {
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen) {
          if (currentView === 'days' && highlightedDate) {
            onDateSelect(highlightedDate);
          } else if (currentView === 'months' && highlightedMonth !== null) {
            onMonthSelect(highlightedMonth);
          } else if (currentView === 'years' && highlightedYear !== null) {
            onYearSelect(highlightedYear);
          } else {
            closeCalendar();
          }
        } else {
          openCalendar();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeCalendar();
      } else if (isOpen) {
        handleViewNavigation(e);
      }
    },
    [
      isOpen,
      currentView,
      highlightedDate,
      highlightedMonth,
      highlightedYear,
      onDateSelect,
      onMonthSelect,
      onYearSelect,
      openCalendar,
      closeCalendar,
      handleViewNavigation,
    ]
  );

  const handleCalendarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Check if any dropdown is currently open by looking for dropdown portals in the DOM
      const isDropdownOpen =
        document.querySelector('[role="listbox"]') !== null;

      // If a dropdown is open, don't handle calendar navigation for arrow keys
      if (
        isDropdownOpen &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          if (currentView === 'days' && highlightedDate) {
            onDateSelect(highlightedDate);
          } else if (currentView === 'months' && highlightedMonth !== null) {
            onMonthSelect(highlightedMonth);
          } else if (currentView === 'years' && highlightedYear !== null) {
            onYearSelect(highlightedYear);
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (currentView === 'years') {
          setCurrentView('months');
          setHighlightedYear(null);
          const currentDisplayYear = displayDate.getFullYear();
          setHighlightedMonth(
            value && value.getFullYear() === currentDisplayYear
              ? value.getMonth()
              : 0
          );
          focusPortal();
        } else if (currentView === 'months') {
          setCurrentView('days');
          const currentDisplayMonth = displayDate.getMonth();
          const currentDisplayYear = displayDate.getFullYear();
          let newHighlight: Date;
          if (
            value &&
            value.getFullYear() === currentDisplayYear &&
            value.getMonth() === currentDisplayMonth
          ) {
            newHighlight = new Date(value);
          } else {
            newHighlight = new Date(currentDisplayYear, currentDisplayMonth, 1);
          }
          setHighlightedDate(newHighlight);
          setHighlightedMonth(null);
          focusPortal();
        } else {
          closeCalendar();
        }
        return;
      }

      handleViewNavigation(e);
    },
    [
      currentView,
      highlightedDate,
      highlightedMonth,
      highlightedYear,
      onDateSelect,
      onMonthSelect,
      onYearSelect,
      closeCalendar,
      setCurrentView,
      setHighlightedDate,
      setHighlightedMonth,
      setHighlightedYear,
      displayDate,
      value,
      focusPortal,
      handleViewNavigation,
    ]
  );

  return {
    handleInputKeyDown,
    handleCalendarKeyDown,
  };
};
