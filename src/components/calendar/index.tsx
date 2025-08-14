import React from 'react';
import { CalendarProvider } from './providers';
import { useCalendarContext } from './hooks';
import {
  CalendarButton,
  CalendarPortal,
  CalendarHeader,
  DaysGrid,
} from './components';
import type { CalendarProps } from './types';

const CalendarContent: React.FC<{
  mode?: 'datepicker' | 'calendar' | 'inline';
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  portalWidth?: string | number;
}> = ({ mode = 'datepicker', label, inputClassName, placeholder, portalWidth }) => {
  const {
    value,
    displayDate,
    highlightedDate,
    minDate,
    maxDate,
    navigateViewDate,
    triggerYearAnimation,
    triggerMonthAnimation,
    handleDateSelect,
    setHighlightedDate,
    setDisplayDate,
    calculatePosition,
  } = useCalendarContext();

  const handleMonthChange = (month: number) => {
    const currentMonth = displayDate.getMonth();

    if (month !== currentMonth) {
      // Determine direction based on month comparison
      const direction = month > currentMonth ? 'next' : 'prev';

      // Trigger horizontal animation before updating the date
      triggerMonthAnimation(direction);

      // Update the display date
      const newDate = new Date(displayDate);
      newDate.setMonth(month);
      setDisplayDate(newDate);
    }

    calculatePosition?.();
  };

  const handleYearChange = (year: number) => {
    const currentYear = displayDate.getFullYear();

    if (year !== currentYear) {
      // Determine direction based on year comparison
      const direction = year > currentYear ? 'next' : 'prev';

      // Trigger vertical animation before updating the date
      triggerYearAnimation(direction);

      // Update the display date
      const newDate = new Date(displayDate);
      newDate.setFullYear(year);
      setDisplayDate(newDate);
    }

    calculatePosition?.();
  };

  // Always render DaysGrid with slide animations
  const renderCalendarContent = () => (
    <DaysGrid
      displayDate={displayDate}
      value={value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelect}
      onDateHighlight={setHighlightedDate}
      animated={true}
    />
  );

  // For inline mode, render calendar directly without portal
  if (mode === 'inline') {
    const width = portalWidth || '280px';
    return (
      <div 
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-xl"
        style={{ 
          width: width,
          minWidth: width
        }}
      >
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={() => navigateViewDate('prev')}
          onNavigateNext={() => navigateViewDate('next')}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
        />
        {renderCalendarContent()}
      </div>
    );
  }

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
        portalWidth={portalWidth}
      />
    </CalendarProvider>
  );
};

export default Calendar;

// Backward compatibility alias
export const Datepicker = Calendar;
