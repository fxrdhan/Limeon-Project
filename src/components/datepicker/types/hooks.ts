import React from 'react';
import { CalendarView, CustomDateValueType } from './components';

// Hook parameter interfaces
export interface UseDatepickerStateParams {
  value: CustomDateValueType;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseDatepickerStateReturn {
  isOpen: boolean;
  isClosing: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
}

export interface UseDatepickerPositionParams {
  triggerRef: React.RefObject<HTMLInputElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  portalWidth?: string | number;
}

export interface UseDatepickerPositionReturn {
  portalStyle: React.CSSProperties;
  isPositionReady: boolean;
  dropDirection: 'down' | 'up';
  calculatePosition: () => void;
}

export interface UseDatepickerKeyboardParams {
  isOpen: boolean;
  currentView: CalendarView;
  highlightedDate: Date | null;
  highlightedMonth: number | null;
  highlightedYear: number | null;
  displayDate: Date;
  value: CustomDateValueType;
  minDate?: Date;
  maxDate?: Date;
  onDateSelect: (date: Date) => void;
  onMonthSelect: (month: number) => void;
  onYearSelect: (year: number) => void;
  openCalendar: () => void;
  closeCalendar: () => void;
  setHighlightedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setHighlightedMonth: React.Dispatch<React.SetStateAction<number | null>>;
  setHighlightedYear: React.Dispatch<React.SetStateAction<number | null>>;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  setCurrentView: React.Dispatch<React.SetStateAction<CalendarView>>;
  navigateViewDate: (direction: 'prev' | 'next') => void;
  navigateYear: (direction: 'prev' | 'next') => void;
  focusPortal: () => void;
}

export interface UseDatepickerKeyboardReturn {
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCalendarKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export interface UseDatepickerNavigationParams {
  displayDate: Date;
  currentView: CalendarView;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
}

export interface UseDatepickerNavigationReturn {
  navigateViewDate: (direction: 'prev' | 'next') => void;
  navigateYear: (direction: 'prev' | 'next') => void;
}

export interface UseDatepickerHoverParams {
  openCalendar: () => void;
  closeCalendar: () => void;
  portalRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseDatepickerHoverReturn {
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  handleCalendarMouseEnter: () => void;
  handleCalendarMouseLeave: () => void;
}
