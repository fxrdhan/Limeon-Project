import React from 'react';
import {
  CalendarDateValue,
  CalendarMode,
  CalendarSize,
  CalendarTrigger,
} from './components';

export interface CalendarContentViewState {
  value: CalendarDateValue;
  displayDate: Date;
  navigationDirection: 'prev' | 'next' | null;
  yearNavigationDirection: 'prev' | 'next' | null;
  highlightedDate: Date | null;
  isInline: boolean;
  size: CalendarSize;
  gridTabIndex: number;
}

export interface CalendarContentBoundsState {
  minDate?: Date;
  maxDate?: Date;
}

export interface CalendarContentInteractionState {
  readOnly?: boolean;
  disabled?: boolean;
}

export interface CalendarContentActions {
  handleDateSelect: (date: Date) => void;
  handleDateHighlight: (date: Date | null) => void;
  handleNavigatePrev: () => void;
  handleNavigateNext: () => void;
  handleMonthChange: (month: number) => void;
  handleYearChange: (year: number) => void;
}

export interface CalendarContentPortalState {
  portalWidth?: string | number;
  portalContentRef: React.RefObject<HTMLDivElement | null>;
  getDayButtonId: (date: Date) => string;
}

export interface CalendarContentContextState {
  actions: CalendarContentActions;
  bounds: CalendarContentBoundsState;
  interaction: CalendarContentInteractionState;
  portal: CalendarContentPortalState;
  view: CalendarContentViewState;
}

export interface CalendarTriggerContextState {
  trigger: CalendarTrigger;
  disabled?: boolean;
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
  value: CalendarDateValue;
  onChange: (date: CalendarDateValue) => void;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
}
