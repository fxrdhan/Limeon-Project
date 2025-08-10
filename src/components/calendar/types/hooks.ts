import React from 'react';
import { CalendarView, CustomDateValueType, CalendarMode } from './components';

// Hook parameter interfaces
export interface UseCalendarStateParams {
  value: CustomDateValueType;
  mode?: CalendarMode;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseCalendarStateReturn {
  isOpen: boolean;
  isClosing: boolean;
  isOpening: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
}

// Backward compatibility aliases
export type UseDatepickerStateParams = UseCalendarStateParams;
export type UseDatepickerStateReturn = UseCalendarStateReturn;

export interface UseCalendarPositionParams {
  triggerRef: React.RefObject<HTMLInputElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  portalWidth?: string | number;
  currentWidth?: number;
  currentHeight?: number;
  resizable?: boolean;
}

export interface UseCalendarPositionReturn {
  portalStyle: React.CSSProperties;
  isPositionReady: boolean;
  dropDirection: 'down' | 'up';
  calculatePosition: () => void;
}

// Backward compatibility aliases
export type UseDatepickerPositionParams = UseCalendarPositionParams;
export type UseDatepickerPositionReturn = UseCalendarPositionReturn;

export interface UseCalendarKeyboardParams {
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

export interface UseCalendarKeyboardReturn {
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCalendarKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

// Backward compatibility aliases
export type UseDatepickerKeyboardParams = UseCalendarKeyboardParams;
export type UseDatepickerKeyboardReturn = UseCalendarKeyboardReturn;

export interface UseCalendarNavigationParams {
  displayDate: Date;
  currentView: CalendarView;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
}

export interface UseCalendarNavigationReturn {
  navigateViewDate: (direction: 'prev' | 'next') => void;
  navigateYear: (direction: 'prev' | 'next') => void;
}

export interface UseCalendarHoverParams {
  openCalendar: () => void;
  closeCalendar: () => void;
  portalRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseCalendarHoverReturn {
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  handleCalendarMouseEnter: () => void;
  handleCalendarMouseLeave: () => void;
}

// Backward compatibility aliases
export type UseDatepickerNavigationParams = UseCalendarNavigationParams;
export type UseDatepickerNavigationReturn = UseCalendarNavigationReturn;
export type UseDatepickerHoverParams = UseCalendarHoverParams;
export type UseDatepickerHoverReturn = UseCalendarHoverReturn;
