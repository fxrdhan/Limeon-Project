import React from 'react';
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb';
import { PharmaComboboxSelect } from '@/components/combobox/presets';
import { MONTH_NAMES_ID } from '../constants';
import type { CalendarHeaderProps } from '../types';

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  displayDate,
  onNavigatePrev,
  onNavigateNext,
  onMonthChange,
  onYearChange,
}) => {
  // Generate month options
  const monthOptions = MONTH_NAMES_ID.map((_, index) => index);

  // Generate year options (current year ± 50 years)
  const currentYear = displayDate.getFullYear();
  const yearOptions = Array.from({ length: 101 }, (_, i) => {
    const year = currentYear - 50 + i;
    return year;
  });

  return (
    <div className="calendar__header">
      <div className="calendar__header-controls">
        <PharmaComboboxSelect
          name="month-selector"
          items={monthOptions}
          value={displayDate.getMonth()}
          onValueChange={value => {
            if (value !== null) onMonthChange(value);
          }}
          itemToStringLabel={value => MONTH_NAMES_ID[value] ?? ''}
          itemToStringValue={value => value.toString()}
          placeholder="Bulan"
          searchable={false}
          indicator="none"
          popupClassName="w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        />

        <PharmaComboboxSelect
          name="year-selector"
          items={yearOptions}
          value={displayDate.getFullYear()}
          onValueChange={value => {
            if (value !== null) onYearChange(value);
          }}
          itemToStringLabel={value => value.toString()}
          itemToStringValue={value => value.toString()}
          placeholder="Tahun"
          searchable={false}
          indicator="none"
          popupClassName="w-[100px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        />
      </div>

      <div className="calendar__header-navigation">
        <button
          onClick={onNavigatePrev}
          className="calendar__nav-button"
          aria-label="Previous month"
        >
          <TbChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>

        <button
          onClick={onNavigateNext}
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
