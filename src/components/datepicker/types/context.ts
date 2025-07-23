import React from "react";
import { CalendarView, CustomDateValueType } from "./components";

export interface DatepickerContextState {
  // Core state
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  
  // Calendar state
  isOpen: boolean;
  isClosing: boolean;
  isPositionReady: boolean;
  displayDate: Date;
  currentView: CalendarView;
  dropDirection: "down" | "up";
  
  // Highlighting state
  highlightedDate: Date | null;
  highlightedMonth: number | null;
  highlightedYear: number | null;
  
  // Configuration
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  
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
  navigateViewDate: (direction: "prev" | "next") => void;
  navigateYear: (direction: "prev" | "next") => void;
  
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

export interface DatepickerProviderProps {
  children: React.ReactNode;
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
}