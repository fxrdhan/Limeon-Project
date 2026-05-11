import React from 'react';
import { CalendarHeader } from './components';
import { CALENDAR_SIZE_PRESETS } from './constants';
import { useCalendarContext } from './hooks';
import { CalendarPrimitive } from './primitive';
import type { CalendarProps } from './types';
import './style.scss';

export type { CalendarProps } from './types';

const PharmaCalendarContent: React.FC<{
  mode?: 'datepicker' | 'inline';
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  portalWidth?: string | number;
  readOnly?: boolean;
  children?: React.ReactNode;
}> = ({
  mode = 'datepicker',
  label,
  inputClassName,
  placeholder,
  portalWidth,
  readOnly,
  children,
}) => {
  const {
    value,
    displayDate,
    highlightedDate,
    minDate,
    maxDate,
    size,
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
      const direction = month > currentMonth ? 'next' : 'prev';

      triggerMonthAnimation(direction);

      const newDate = new Date(displayDate);
      newDate.setMonth(month);
      setDisplayDate(newDate);
    }

    calculatePosition?.();
  };

  const handleYearChange = (year: number) => {
    const currentYear = displayDate.getFullYear();

    if (year !== currentYear) {
      const direction = year > currentYear ? 'next' : 'prev';

      triggerYearAnimation(direction);

      const newDate = new Date(displayDate);
      newDate.setFullYear(year);
      setDisplayDate(newDate);
    }

    calculatePosition?.();
  };

  const handleDateSelectWrapper = (date: Date) => {
    if (mode !== 'inline' && !readOnly) {
      handleDateSelect(date);
    }
  };

  const renderCalendarContent = () => (
    <CalendarPrimitive.Grid
      displayDate={displayDate}
      value={readOnly ? null : value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelectWrapper}
      onDateHighlight={setHighlightedDate}
      animated={true}
    />
  );

  if (mode === 'inline') {
    const sizeConfig = CALENDAR_SIZE_PRESETS[size];
    const width = portalWidth || `${sizeConfig.width}px`;
    return (
      <div
        className="calendar-container-inline"
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

  return (
    <>
      {children ? (
        <CalendarPrimitive.Trigger>{children}</CalendarPrimitive.Trigger>
      ) : (
        <CalendarPrimitive.Button
          value={value}
          placeholder={placeholder}
          inputClassName={inputClassName}
          label={label}
        />
      )}

      <CalendarPrimitive.Portal>
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={() => navigateViewDate('prev')}
          onNavigateNext={() => navigateViewDate('next')}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
        />
        {renderCalendarContent()}
      </CalendarPrimitive.Portal>
    </>
  );
};

export const PharmaCalendar: React.FC<CalendarProps> = ({
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
  readOnly,
  children,
}) => {
  const effectiveTrigger = trigger || (mode === 'inline' ? 'hover' : 'click');
  const effectiveReadOnly =
    readOnly ?? (mode === 'datepicker' && effectiveTrigger === 'hover');

  return (
    <CalendarPrimitive.Root
      mode={mode}
      size={size}
      trigger={effectiveTrigger}
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      portalWidth={portalWidth}
      readOnly={effectiveReadOnly}
    >
      <PharmaCalendarContent
        mode={mode}
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
        portalWidth={portalWidth}
        readOnly={effectiveReadOnly}
      >
        {children}
      </PharmaCalendarContent>
    </CalendarPrimitive.Root>
  );
};

export const Calendar = PharmaCalendar;
export default PharmaCalendar;
