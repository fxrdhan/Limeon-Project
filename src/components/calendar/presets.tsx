import React from 'react';
import { CalendarHeader } from './components';
import { CALENDAR_SIZE_PRESETS } from './constants';
import { useCalendarContentContext } from './hooks';
import { CalendarPrimitive } from './primitive';
import {
  clampMonthToRange,
  createDisplayDate,
  isMonthInRange,
  isYearInRange,
} from './utils';
import type { CalendarProps } from './types';
import './style.scss';

export type { CalendarProps } from './types';

type PharmaCalendarContentProps = Pick<
  CalendarProps,
  'children' | 'id' | 'inputClassName' | 'label' | 'name' | 'placeholder'
>;

const PharmaCalendarContent: React.FC<PharmaCalendarContentProps> = ({
  id,
  name,
  label,
  inputClassName,
  placeholder,
  children,
}) => {
  const {
    value,
    displayDate,
    highlightedDate,
    mode,
    minDate,
    maxDate,
    size,
    navigationDirection,
    yearNavigationDirection,
    navigateViewDate,
    triggerYearAnimation,
    triggerMonthAnimation,
    handleDateSelect,
    setHighlightedDate,
    setDisplayDate,
    calculatePosition,
    getDayButtonId,
    portalContentRef,
    portalWidth,
    readOnly,
  } = useCalendarContentContext();

  const handleMonthChange = (month: number) => {
    const currentMonth = displayDate.getMonth();
    const currentYear = displayDate.getFullYear();

    if (!isMonthInRange(currentYear, month, minDate, maxDate)) return;

    if (month !== currentMonth) {
      const direction = month > currentMonth ? 'next' : 'prev';

      triggerMonthAnimation(direction);
      setDisplayDate(createDisplayDate(displayDate, currentYear, month));
    }

    calculatePosition?.();
  };

  const handleYearChange = (year: number) => {
    const currentYear = displayDate.getFullYear();

    if (!isYearInRange(year, minDate, maxDate)) return;

    if (year !== currentYear) {
      const direction = year > currentYear ? 'next' : 'prev';
      const targetMonth = clampMonthToRange(
        year,
        displayDate.getMonth(),
        minDate,
        maxDate
      );

      triggerYearAnimation(direction);
      setDisplayDate(createDisplayDate(displayDate, year, targetMonth));
    }

    calculatePosition?.();
  };

  const renderCalendarContent = () => (
    <CalendarPrimitive.Grid
      displayDate={displayDate}
      value={value}
      highlightedDate={highlightedDate}
      minDate={minDate}
      maxDate={maxDate}
      onDateSelect={handleDateSelect}
      onDateHighlight={setHighlightedDate}
      getDayButtonId={getDayButtonId}
      navigationDirection={navigationDirection}
      yearNavigationDirection={yearNavigationDirection}
      readOnly={readOnly}
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
          maxWidth: '100%',
        }}
      >
        <CalendarHeader
          displayDate={displayDate}
          onNavigatePrev={() => navigateViewDate('prev')}
          onNavigateNext={() => navigateViewDate('next')}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          minDate={minDate}
          maxDate={maxDate}
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
          id={id}
          name={name}
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
          minDate={minDate}
          maxDate={maxDate}
          popupContainerRef={portalContentRef}
        />
        {renderCalendarContent()}
      </CalendarPrimitive.Portal>
    </>
  );
};

export const PharmaCalendar: React.FC<CalendarProps> = ({
  id,
  name,
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
  const effectiveReadOnly = readOnly ?? false;

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
        id={id}
        name={name}
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
      >
        {children}
      </PharmaCalendarContent>
    </CalendarPrimitive.Root>
  );
};

export const Calendar = PharmaCalendar;
export default PharmaCalendar;
