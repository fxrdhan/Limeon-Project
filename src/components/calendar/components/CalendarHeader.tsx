import React from 'react';
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';
import { MONTH_NAMES_ID } from '../constants';
import { getCalendarHeaderModel } from './calendarHeaderModel';
import type { CalendarHeaderProps } from '../types';

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  displayDate,
  onNavigatePrev,
  onNavigateNext,
  onMonthChange,
  onYearChange,
  minDate,
  maxDate,
  disabled = false,
  renderMonthSelect,
  renderYearSelect,
}) => {
  const {
    canNavigateNext,
    canNavigatePrev,
    isMonthDisabled,
    isYearDisabled,
    monthOptions,
    yearOptions,
  } = getCalendarHeaderModel(displayDate, minDate, maxDate);
  const isNavigatePrevDisabled = disabled || !canNavigatePrev;
  const isNavigateNextDisabled = disabled || !canNavigateNext;

  return (
    <div className="calendar__header">
      <div className="calendar__header-controls">
        {renderMonthSelect({
          className: 'calendar__month-select',
          label: 'Bulan',
          items: monthOptions,
          value: displayDate.getMonth(),
          onValueChange: value => {
            if (!disabled && value !== null) onMonthChange(value);
          },
          isItemDisabled: isMonthDisabled,
          itemToStringLabel: value => MONTH_NAMES_ID[value] ?? '',
          itemToStringValue: value => value.toString(),
          placeholder: 'Bulan',
          disabled,
        })}

        {renderYearSelect({
          className: 'calendar__year-select',
          label: 'Tahun',
          items: yearOptions,
          value: displayDate.getFullYear(),
          onValueChange: value => {
            if (!disabled && value !== null) onYearChange(value);
          },
          isItemDisabled: isYearDisabled,
          itemToStringLabel: value => value.toString(),
          itemToStringValue: value => value.toString(),
          placeholder: 'Tahun',
          disabled,
        })}
      </div>

      <div className="calendar__header-navigation">
        <button
          type="button"
          onClick={() => {
            if (!isNavigatePrevDisabled) onNavigatePrev();
          }}
          disabled={isNavigatePrevDisabled}
          aria-disabled={isNavigatePrevDisabled}
          className="calendar__nav-button"
          aria-label="Bulan sebelumnya"
        >
          <TbChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isNavigateNextDisabled) onNavigateNext();
          }}
          disabled={isNavigateNextDisabled}
          aria-disabled={isNavigateNextDisabled}
          className="calendar__nav-button"
          aria-label="Bulan berikutnya"
        >
          <TbChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
