import React from 'react';
import { CustomDateValueType } from './components';

// Hook parameter interfaces
export interface UseCalendarStateParams {
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseCalendarStateReturn {
  isOpen: boolean;
  isClosing: boolean;
  isOpening: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
  setIsOpening: (value: boolean) => void;
}

export interface UseCalendarPositionParams {
  triggerRef: React.RefObject<HTMLElement | null>;
  portalRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  portalWidth?: string | number;
  calendarWidth?: number;
}

export interface UseCalendarPositionReturn {
  portalStyle: React.CSSProperties;
  isPositionReady: boolean;
  dropDirection: 'down' | 'up';
  setPortalContentRef: (node: HTMLDivElement | null) => void;
  calculatePosition: () => void;
}

export interface UseCalendarKeyboardParams {
  isOpen: boolean;
  highlightedDate: Date | null;
  displayDate: Date;
  value: CustomDateValueType;
  minDate?: Date;
  maxDate?: Date;
  onDateSelect: (date: Date) => void;
  onDateClear: () => void;
  openCalendar: () => void;
  closeCalendar: () => void;
  closeCalendarAndRestoreFocus: () => void;
  setHighlightedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  navigateViewDate: (direction: 'prev' | 'next') => boolean;
  navigateYearWithAnimation: (direction: 'prev' | 'next') => boolean;
  focusPortal: () => void;
}

export interface UseCalendarKeyboardReturn {
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  handleCalendarKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export interface UseCalendarNavigationParams {
  displayDate: Date;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  minDate?: Date;
  maxDate?: Date;
}

export interface UseCalendarNavigationReturn {
  navigateViewDate: (direction: 'prev' | 'next') => boolean;
  navigateYear: (direction: 'prev' | 'next') => boolean;
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
