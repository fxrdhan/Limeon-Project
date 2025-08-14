import React from 'react';
import { CalendarProvider } from './providers';
import { useCalendarContext } from './hooks';
import {
  CalendarButton,
  CalendarPortal,
  CalendarHeader,
  DaysGrid,
} from './components';
import { CALENDAR_SIZE_PRESETS } from './constants';
import type { CalendarProps } from './types';

const CalendarContent: React.FC<{
  mode?: 'datepicker' | 'inline';
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  portalWidth?: string | number;
  children?: React.ReactNode;
}> = ({
  mode = 'datepicker',
  label,
  inputClassName,
  placeholder,
  portalWidth,
  children,
}) => {
  const {
    value,
    displayDate,
    highlightedDate,
    minDate,
    maxDate,
    size,
    trigger,
    navigateViewDate,
    triggerYearAnimation,
    triggerMonthAnimation,
    handleDateSelect,
    setHighlightedDate,
    setDisplayDate,
    calculatePosition,
    triggerInputRef,
    handleTriggerClick,
    handleInputKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
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

  // Disable date selection for inline mode
  const handleDateSelectWrapper = (date: Date) => {
    if (mode !== 'inline') {
      handleDateSelect(date);
    }
  };

  // Always render DaysGrid with slide animations
  const renderCalendarContent = () => (
    <DaysGrid
      displayDate={displayDate}
      value={value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelectWrapper}
      onDateHighlight={setHighlightedDate}
      animated={true}
    />
  );

  // For inline mode, render calendar directly without portal
  if (mode === 'inline') {
    const sizeConfig = CALENDAR_SIZE_PRESETS[size];
    const width = portalWidth || `${sizeConfig.width}px`;
    return (
      <div
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-xl"
        style={{
          width: width,
          minWidth: width,
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

  // For datepicker mode, render button/custom trigger + portal
  return (
    <>
      {children ? (
        // Custom trigger element with proper event handlers
        <div
          ref={triggerInputRef as React.RefObject<HTMLDivElement>}
          onClick={trigger === 'click' ? handleTriggerClick : undefined}
          onMouseEnter={
            trigger === 'hover' ? handleTriggerMouseEnter : undefined
          }
          onMouseLeave={
            trigger === 'hover' ? handleTriggerMouseLeave : undefined
          }
          onKeyDown={handleInputKeyDown}
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          {children}
        </div>
      ) : (
        // Default CalendarButton
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
  trigger,
  value,
  onChange,
  label,
  inputClassName,
  placeholder,
  minDate,
  maxDate,
  portalWidth,
  children,
}) => {
  // Set default trigger based on mode: inline defaults to hover, datepicker defaults to click
  const effectiveTrigger = trigger || (mode === 'inline' ? 'hover' : 'click');
  return (
    <CalendarProvider
      mode={mode}
      size={size}
      trigger={effectiveTrigger}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      portalWidth={portalWidth}
    >
      <CalendarContent
        mode={mode}
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
        portalWidth={portalWidth}
      >
        {children}
      </CalendarContent>
    </CalendarProvider>
  );
};

export default Calendar;

// Backward compatibility alias
export const Datepicker = Calendar;
