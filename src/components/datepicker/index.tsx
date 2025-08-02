import React from 'react';
import { DatepickerProvider } from './providers';
import { useDatepickerContext } from './hooks';
import {
  CalendarButton,
  CalendarPortal,
  CalendarHeader,
  DaysGrid,
  MonthsGrid,
  YearsGrid,
} from './components';
import type { DatepickerProps } from './types';

const DatepickerContent: React.FC<{
  label?: string;
  inputClassName?: string;
  placeholder?: string;
}> = ({ label, inputClassName, placeholder }) => {
  const {
    value,
    currentView,
    displayDate,
    highlightedDate,
    highlightedMonth,
    highlightedYear,
    minDate,
    maxDate,
    navigateViewDate,
    handleDateSelect,
    handleMonthSelect,
    handleYearSelect,
    setHighlightedDate,
    setHighlightedMonth,
    setHighlightedYear,
    setCurrentView,
    calculatePosition,
  } = useDatepickerContext();

  const handleHeaderClick = () => {
    if (currentView === 'days') {
      setCurrentView('months');
      setHighlightedDate(null);
      setHighlightedMonth(value ? value.getMonth() : 0);
    } else if (currentView === 'months') {
      setCurrentView('years');
      setHighlightedMonth(null);
      setHighlightedYear(
        value ? value.getFullYear() : displayDate.getFullYear()
      );
    }
    calculatePosition?.();

    // Focus portal after state update
    setTimeout(() => {
      const portalElement = document.querySelector(
        '[tabindex="0"]'
      ) as HTMLElement;
      if (portalElement) {
        portalElement.focus();
      }
    }, 0);
  };

  const renderCalendarContent = () => {
    switch (currentView) {
      case 'days':
        return (
          <DaysGrid
            displayDate={displayDate}
            value={value}
            highlightedDate={highlightedDate}
            minDate={minDate}
            maxDate={maxDate}
            onDateSelect={handleDateSelect}
            onDateHighlight={setHighlightedDate}
          />
        );
      case 'months':
        return (
          <MonthsGrid
            displayDate={displayDate}
            value={value}
            highlightedMonth={highlightedMonth}
            minDate={minDate}
            maxDate={maxDate}
            onMonthSelect={handleMonthSelect}
            onMonthHighlight={setHighlightedMonth}
          />
        );
      case 'years':
        return (
          <YearsGrid
            displayDate={displayDate}
            value={value}
            highlightedYear={highlightedYear}
            minDate={minDate}
            maxDate={maxDate}
            onYearSelect={handleYearSelect}
            onYearHighlight={setHighlightedYear}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <CalendarButton
        value={value}
        placeholder={placeholder}
        inputClassName={inputClassName}
        label={label}
      />

      <CalendarPortal>
        <CalendarHeader
          currentView={currentView}
          displayDate={displayDate}
          onNavigatePrev={() => navigateViewDate('prev')}
          onNavigateNext={() => navigateViewDate('next')}
          onHeaderClick={handleHeaderClick}
        />
        {renderCalendarContent()}
      </CalendarPortal>
    </>
  );
};

const Datepicker: React.FC<DatepickerProps> = ({
  value,
  onChange,
  label,
  inputClassName,
  placeholder,
  minDate,
  maxDate,
  portalWidth,
}) => {
  return (
    <DatepickerProvider
      value={value}
      onChange={onChange}
      minDate={minDate}
      maxDate={maxDate}
      portalWidth={portalWidth}
    >
      <DatepickerContent
        label={label}
        inputClassName={inputClassName}
        placeholder={placeholder}
      />
    </DatepickerProvider>
  );
};

export default Datepicker;
