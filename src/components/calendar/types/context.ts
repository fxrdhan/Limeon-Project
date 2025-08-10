import React from 'react';
import { CalendarView, CustomDateValueType, CalendarMode, CalendarSize } from './components';

export interface CalendarContextState {
  // Core state
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;

  // Calendar state
  isOpen: boolean;
  isClosing: boolean;
  isOpening: boolean;
  isPositionReady: boolean;
  displayDate: Date;
  currentView: CalendarView;
  dropDirection: 'down' | 'up';
  navigationDirection: 'prev' | 'next' | null;

  // Highlighting state
  highlightedDate: Date | null;
  highlightedMonth: number | null;
  highlightedYear: number | null;

  // Configuration
  mode: CalendarMode;
  size: CalendarSize;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  resizable: boolean;
  currentWidth: number;
  currentHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;

  // Portal styling
  portalStyle: React.CSSProperties;

  // Actions
  openCalendar: () => void;
  closeCalendar: () => void;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  setCurrentView: React.Dispatch<React.SetStateAction<CalendarView>>;
  setHighlightedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setHighlightedMonth: React.Dispatch<React.SetStateAction<number | null>>;
  setHighlightedYear: React.Dispatch<React.SetStateAction<number | null>>;

  // Handlers
  handleDateSelect: (date: Date) => void;
  handleMonthSelect: (month: number) => void;
  handleYearSelect: (year: number) => void;

  // Navigation
  navigateViewDate: (direction: 'prev' | 'next') => void;
  navigateYear: (direction: 'prev' | 'next') => void;

  // Refs
  triggerInputRef: React.RefObject<HTMLInputElement | null>;
  portalContentRef: React.RefObject<HTMLDivElement | null>;

  // Additional handlers for components
  handleTriggerClick: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCalendarKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
  handleCalendarMouseEnter: () => void;
  handleCalendarMouseLeave: () => void;

  // Position calculation
  calculatePosition: () => void;
}

export interface CalendarProviderProps {
  children: React.ReactNode;
  mode?: CalendarMode;
  size?: CalendarSize;
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  resizable?: boolean;
}

export interface DatepickerProviderProps extends CalendarProviderProps {
  mode?: 'datepicker';
}
