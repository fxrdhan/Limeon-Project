import React from 'react';
import { CalendarProvider } from './providers';
import { useCalendarContext } from './hooks';
import {
  CalendarButton,
  CalendarPortal,
  CalendarHeader,
  AnimatedDaysGrid,
} from './components';
import type { CalendarProps } from './types';

const CalendarContent: React.FC<{
  mode?: 'datepicker' | 'calendar';
  label?: string;
  inputClassName?: string;
  placeholder?: string;
}> = ({ mode = 'datepicker', label, inputClassName, placeholder }) => {
  const {
    value,
    displayDate,
    highlightedDate,
    minDate,
    maxDate,
    navigateViewDate,
    handleDateSelect,
    setHighlightedDate,
    setDisplayDate,
    calculatePosition,
  } = useCalendarContext();

  const handleMonthChange = (month: number) => {
    const newDate = new Date(displayDate);
    newDate.setMonth(month);
    setDisplayDate(newDate);
    calculatePosition?.();
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(displayDate);
    newDate.setFullYear(year);
    setDisplayDate(newDate);
    calculatePosition?.();
  };

  // Always render AnimatedDaysGrid with slide animations
  const renderCalendarContent = () => (
    <AnimatedDaysGrid
      displayDate={displayDate}
      value={value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelect}
      onDateHighlight={setHighlightedDate}
    />
  );

  return (
    <>
      {mode === 'datepicker' && (
        <CalendarButton
          value={value}
          placeholder={placeholder}
          inputClassName={inputClassName}
          label={label}
        />
      )}

      <CalendarPortal>
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={() => navigateViewDate('prev')}
          onNavigateNext={() => navigateViewDate('next')}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
        />
        {renderCalendarContent()}
      </CalendarPortal>
    </>
  );
};

const Calendar: React.FC<CalendarProps> = ({
  mode = 'datepicker',
  size = 'md',
  value,
  onChange,
  label,
  inputClassName,
  placeholder,
  minDate,
  maxDate,
  portalWidth,
  resizable = false,
}) => {
  return (
    <CalendarProvider
      mode={mode}
      size={size}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      portalWidth={portalWidth}
      resizable={resizable}
    >
      <CalendarContent
        mode={mode}
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
      />
    </CalendarProvider>
  );
};

export default Calendar;

// Backward compatibility alias
export const Datepicker = Calendar;
