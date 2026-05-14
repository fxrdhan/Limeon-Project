import React from 'react';

/**
 * Calendar values are local date-only values. The component accepts Date
 * instances for React form ergonomics, but only year/month/day are meaningful.
 */
export type CalendarDateValue = Date | null;
export type CustomDateValueType = CalendarDateValue;

export type CalendarMode = 'datepicker' | 'inline';
export type CalendarSize = 'md' | 'lg' | 'xl';
export type CalendarTrigger = 'click' | 'hover';

export interface CalendarProps {
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  mode?: CalendarMode;
  size?: CalendarSize;
  trigger?: CalendarTrigger;
  value: CalendarDateValue;
  onChange: (date: CalendarDateValue) => void;
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
  children?: React.ReactNode; // For custom trigger element
}

export interface CalendarButtonProps {
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  value: CalendarDateValue;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

export interface CalendarHeaderSelectRenderProps {
  className: string;
  label: string;
  items: number[];
  value: number;
  onValueChange: (value: number | null) => void;
  isItemDisabled: (value: number) => boolean;
  itemToStringLabel: (value: number) => string;
  itemToStringValue: (value: number) => string;
  placeholder: string;
  disabled?: boolean;
}

export interface CalendarPortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment;
  title?: React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export interface CalendarHeaderProps {
  displayDate: Date;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  renderMonthSelect: (
    props: CalendarHeaderSelectRenderProps
  ) => React.ReactNode;
  renderYearSelect: (props: CalendarHeaderSelectRenderProps) => React.ReactNode;
}

export interface DaysGridProps {
  displayDate: Date;
  value: CalendarDateValue;
  highlightedDate: Date | null;
  minDate?: Date;
  maxDate?: Date;
  onDateSelect: (date: Date) => void;
  onDateHighlight: (date: Date | null) => void;
  getDayButtonId: (date: Date) => string;
  gridTabIndex?: number;
  onGridKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  readOnly?: boolean;
  disabled?: boolean;
  fixedWeekCount?: boolean;
}

export interface AnimatedDaysGridProps extends DaysGridProps {
  navigationDirection?: 'prev' | 'next' | null;
  yearNavigationDirection?: 'prev' | 'next' | null;
}
