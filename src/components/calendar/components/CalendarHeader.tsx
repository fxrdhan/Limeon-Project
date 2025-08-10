import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Dropdown from '@/components/dropdown';
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
  const monthOptions = MONTH_NAMES_ID.map((name, index) => ({
    id: index.toString(),
    name,
  }));

  // Generate year options (current year ± 50 years)
  const currentYear = displayDate.getFullYear();
  const yearOptions = Array.from({ length: 101 }, (_, i) => {
    const year = currentYear - 50 + i;
    return {
      id: year.toString(),
      name: year.toString(),
    };
  });

  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2">
        <Dropdown
          mode="text"
          portalWidth="120px"
          options={monthOptions}
          value={displayDate.getMonth().toString()}
          onChange={value => onMonthChange(parseInt(value))}
          placeholder="Bulan"
          name="month-selector"
          searchList={false}
        />

        <Dropdown
          mode="text"
          portalWidth="100px"
          options={yearOptions}
          value={displayDate.getFullYear().toString()}
          onChange={value => onYearChange(parseInt(value))}
          placeholder="Tahun"
          name="year-selector"
          searchList={false}
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onNavigatePrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-hidden transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Previous month"
        >
          <FaChevronLeft size={12} />
        </button>

        <button
          onClick={onNavigateNext}
          className="p-1.5 rounded-lg hover:bg-gray-100 focus:outline-hidden transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Next month"
        >
          <FaChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
