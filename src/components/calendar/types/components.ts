import React from 'react';

export type CalendarView = 'days' | 'months' | 'years';

export type CustomDateValueType = Date | null;

export type CalendarMode = 'datepicker' | 'inline';
export type CalendarSize = 'md' | 'lg' | 'xl';
export type CalendarTrigger = 'click' | 'hover';

export interface CalendarProps {
  mode?: CalendarMode;
  size?: CalendarSize;
  trigger?: CalendarTrigger;
  value: CustomDateValueType;
  onChange: (date: CustomDateValueType) => void;
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  children?: React.ReactNode; // For custom trigger element
}

export interface DatepickerProps extends CalendarProps {
  mode?: 'datepicker';
}

export interface CalendarButtonProps {
  value: CustomDateValueType;
  placeholder?: string;
  inputClassName?: string;
  label?: string;
}

export interface CalendarPortalProps {
  children: React.ReactNode;
}

export interface CalendarHeaderProps {
  displayDate: Date;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export interface DaysGridProps {
  displayDate: Date;
  value: CustomDateValueType;
  highlightedDate: Date | null;
  minDate?: Date;
  maxDate?: Date;
  onDateSelect: (date: Date) => void;
  onDateHighlight: (date: Date | null) => void;
  animated?: boolean;
}

export interface MonthsGridProps {
  displayDate: Date;
  value: CustomDateValueType;
  highlightedMonth: number | null;
  minDate?: Date;
  maxDate?: Date;
  onMonthSelect: (month: number) => void;
  onMonthHighlight: (month: number | null) => void;
}

export interface YearsGridProps {
  displayDate: Date;
  value: CustomDateValueType;
  highlightedYear: number | null;
  minDate?: Date;
  maxDate?: Date;
  onYearSelect: (year: number) => void;
  onYearHighlight: (year: number | null) => void;
}
