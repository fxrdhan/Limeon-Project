import { useCallback, useRef, type KeyboardEvent } from 'react';
import { isDateInRange } from '../utils';
import type {
  UseCalendarKeyboardParams,
  UseCalendarKeyboardReturn,
} from '../types';

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    element => !element.hasAttribute('disabled') && element.tabIndex >= 0
  );

export const useCalendarKeyboard = (
  params: UseCalendarKeyboardParams
): UseCalendarKeyboardReturn => {
  const {
    isOpen,
    highlightedDate,
    displayDate,
    value,
    minDate,
    maxDate,
    onDateSelect,
    onDateClear,
    openCalendar,
    closeCalendar,
    closeCalendarAndRestoreFocus,
    setHighlightedDate,
    setDisplayDate,
    navigateViewDate,
    navigateYearWithAnimation,
    focusPortal,
    trapFocus = true,
  } = params;

  const handleDaysNavigation = useCallback(
    (e: KeyboardEvent) => {
      const isDisplayedMonth = (date: Date | null) =>
        Boolean(
          date &&
          date.getMonth() === displayDate.getMonth() &&
          date.getFullYear() === displayDate.getFullYear()
        );
      const currentHighlight =
        (isDisplayedMonth(highlightedDate) && highlightedDate) ||
        (isDisplayedMonth(value) && value) ||
        displayDate;
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

      if (!navigated) return;

      e.preventDefault();
      e.stopPropagation();

      if (!isDateInRange(newHighlight, minDate, maxDate)) return;

      setHighlightedDate(newHighlight);
      if (
        newHighlight.getMonth() !== displayDate.getMonth() ||
        newHighlight.getFullYear() !== displayDate.getFullYear()
      ) {
        setDisplayDate(
          new Date(newHighlight.getFullYear(), newHighlight.getMonth(), 1)
        );
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

  const handleViewNavigation = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        let handled = false;

        switch (e.key) {
          case 'ArrowLeft':
            handled = true;
            navigateViewDate('prev');
            break;
          case 'ArrowRight':
            handled = true;
            navigateViewDate('next');
            break;
          case 'ArrowUp':
            handled = true;
            navigateYearWithAnimation('prev');
            break;
          case 'ArrowDown':
            handled = true;
            navigateYearWithAnimation('next');
            break;
        }

        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      handleDaysNavigation(e);
    },
    [navigateViewDate, navigateYearWithAnimation, handleDaysNavigation]
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Tab' && isOpen) {
        closeCalendar();
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && value) {
        e.preventDefault();
        e.stopPropagation();
        onDateClear();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          if (highlightedDate) {
            onDateSelect(highlightedDate);
          } else {
            closeCalendarAndRestoreFocus();
          }
        } else {
          openCalendar();
          focusPortal();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeCalendarAndRestoreFocus();
      } else if (isOpen) {
        handleViewNavigation(e);
      }
    },
    [
      isOpen,
      highlightedDate,
      value,
      onDateSelect,
      onDateClear,
      openCalendar,
      closeCalendar,
      closeCalendarAndRestoreFocus,
      focusPortal,
      handleViewNavigation,
    ]
  );

  const handleCalendarTabKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const focusableElements = getFocusableElements(e.currentTarget);

      if (focusableElements.length === 0) {
        e.preventDefault();
        e.currentTarget.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const activeElementIsInsideCycle = focusableElements.some(
        element => element === activeElement
      );

      if (e.shiftKey) {
        if (!activeElementIsInsideCycle || activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!activeElementIsInsideCycle || activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
    []
  );

  const handleCalendarKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const activePopupTrigger =
        e.target instanceof Element
          ? e.target.closest('[aria-expanded="true"][aria-controls]')
          : null;

      if (
        activePopupTrigger &&
        e.currentTarget.contains(activePopupTrigger) &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        return;
      }

      if (e.key === 'Tab') {
        if (!trapFocus) return;

        e.stopPropagation();
        handleCalendarTabKey(e);
        return;
      }

      if (e.key === 'Enter') {
        const isGridTarget =
          e.target instanceof HTMLElement &&
          e.target.hasAttribute('data-calendar-grid');

        if (e.target === e.currentTarget || isGridTarget) {
          e.preventDefault();
          e.stopPropagation();
          if (highlightedDate) {
            onDateSelect(highlightedDate);
          }
        }
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && value) {
        e.preventDefault();
        e.stopPropagation();
        onDateClear();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeCalendarAndRestoreFocus();
        return;
      }

      handleViewNavigation(e);
    },
    [
      highlightedDate,
      value,
      onDateSelect,
      onDateClear,
      closeCalendarAndRestoreFocus,
      handleCalendarTabKey,
      handleViewNavigation,
      trapFocus,
    ]
  );

  const handleInputKeyDownRef = useRef(handleInputKeyDown);
  const handleCalendarKeyDownRef = useRef(handleCalendarKeyDown);

  handleInputKeyDownRef.current = handleInputKeyDown;
  handleCalendarKeyDownRef.current = handleCalendarKeyDown;

  const stableHandleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      handleInputKeyDownRef.current(e);
    },
    []
  );

  const stableHandleCalendarKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      handleCalendarKeyDownRef.current(e);
    },
    []
  );

  return {
    handleInputKeyDown: stableHandleInputKeyDown,
    handleCalendarKeyDown: stableHandleCalendarKeyDown,
  };
};
