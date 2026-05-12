import React from 'react';
import {
  CustomDateValueType,
  CalendarMode,
  CalendarSize,
  CalendarTrigger,
} from './components';

export interface CalendarContentContextState {
  value: CustomDateValueType;
  displayDate: Date;
  navigationDirection: 'prev' | 'next' | null;
  yearNavigationDirection: 'prev' | 'next' | null;
  highlightedDate: Date | null;
  mode: CalendarMode;
  size: CalendarSize;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  setHighlightedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  handleDateSelect: (date: Date) => void;
  navigateViewDate: (direction: 'prev' | 'next') => boolean;
  triggerYearAnimation: (direction: 'prev' | 'next') => void;
  triggerMonthAnimation: (direction: 'prev' | 'next') => void;
  portalContentRef: React.RefObject<HTMLDivElement | null>;
  getDayButtonId: (date: Date) => string;
  calculatePosition: () => void;
}

export interface CalendarTriggerContextState {
  trigger: CalendarTrigger;
  triggerInputRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  triggerId: string;
  portalId: string;
  handleTriggerClick: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerMouseLeave: () => void;
}

export interface CalendarPortalContextState {
  isOpen: boolean;
  isClosing: boolean;
  isOpening: boolean;
  isPositionReady: boolean;
  dropDirection: 'down' | 'up';
  portalStyle: React.CSSProperties;
  setPortalContentRef: (node: HTMLDivElement | null) => void;
  portalId: string;
  portalTitleId: string;
  handleCalendarKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleCalendarMouseEnter: () => void;
  handleCalendarMouseLeave: () => void;
  trigger: CalendarTrigger;
}

export interface CalendarRootContextState {
  content: CalendarContentContextState;
  trigger: CalendarTriggerContextState;
  portal: CalendarPortalContextState;
}

export interface CalendarProviderProps {
  children: React.ReactNode;
  mode?: CalendarMode;
  size?: CalendarSize;
  trigger?: CalendarTrigger;
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
}
