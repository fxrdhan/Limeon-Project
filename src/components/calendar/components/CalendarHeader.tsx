import React from 'react';
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';
import { PharmaComboboxSelect } from '@/components/combobox';
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
  popupContainerRef,
}) => {
  const {
    canNavigateNext,
    canNavigatePrev,
    isMonthDisabled,
    isYearDisabled,
    monthOptions,
    yearOptions,
  } = getCalendarHeaderModel(displayDate, minDate, maxDate);

  return (
    <div className="calendar__header">
      <div className="calendar__header-controls">
        <PharmaComboboxSelect
          className="calendar__month-select"
          label="Bulan"
          items={monthOptions}
          value={displayDate.getMonth()}
          onValueChange={value => {
            if (value !== null) onMonthChange(value);
          }}
          isItemDisabled={isMonthDisabled}
          itemToStringLabel={value => MONTH_NAMES_ID[value] ?? ''}
          itemToStringValue={value => value.toString()}
          placeholder="Bulan"
          searchable={false}
          indicator="none"
          popupClassName="w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          popupContainerRef={popupContainerRef}
          popupMatchAnchorWidth={false}
        />

        <PharmaComboboxSelect
          className="calendar__year-select"
          label="Tahun"
          items={yearOptions}
          value={displayDate.getFullYear()}
          onValueChange={value => {
            if (value !== null) onYearChange(value);
          }}
          isItemDisabled={isYearDisabled}
          itemToStringLabel={value => value.toString()}
          itemToStringValue={value => value.toString()}
          placeholder="Tahun"
          searchable={false}
          indicator="none"
          popupClassName="w-[100px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          popupContainerRef={popupContainerRef}
          popupMatchAnchorWidth={false}
        />
      </div>

      <div className="calendar__header-navigation">
        <button
          onClick={() => {
            if (canNavigatePrev) onNavigatePrev();
          }}
          disabled={!canNavigatePrev}
          aria-disabled={!canNavigatePrev}
          className="calendar__nav-button"
          aria-label="Previous month"
        >
          <TbChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>

        <button
          onClick={() => {
            if (canNavigateNext) onNavigateNext();
          }}
          disabled={!canNavigateNext}
          aria-disabled={!canNavigateNext}
          className="calendar__nav-button"
          aria-label="Next month"
        >
          <TbChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
