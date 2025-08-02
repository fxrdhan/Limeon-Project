import React from 'react';
import classNames from 'classnames';
import { MONTH_NAMES_ID } from '../constants';
import type { MonthsGridProps } from '../types';

const MonthsGrid: React.FC<MonthsGridProps> = ({
  displayDate,
  value,
  highlightedMonth,
  minDate,
  maxDate,
  onMonthSelect,
  onMonthHighlight,
}) => {
  const currentYear = displayDate.getFullYear();

  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      {MONTH_NAMES_ID.map((monthName, index) => {
        let isDisabled = false;
        if (minDate) {
          const minD = new Date(minDate);
          minD.setDate(1);
          minD.setHours(0, 0, 0, 0);
          const lastDayOfMonth = new Date(currentYear, index + 1, 0);
          if (lastDayOfMonth < minD) isDisabled = true;
        }
        if (maxDate) {
          const maxD = new Date(maxDate);
          maxD.setDate(1);
          maxD.setHours(0, 0, 0, 0);
          const firstDayOfMonth = new Date(currentYear, index, 1);
          if (firstDayOfMonth > maxD) isDisabled = true;
        }

        const isSelected =
          value &&
          value.getFullYear() === currentYear &&
          value.getMonth() === index;
        const isHighlighted = highlightedMonth === index;

        return (
          <button
            key={monthName}
            onClick={() => !isDisabled && onMonthSelect(index)}
            onMouseEnter={() => !isDisabled && onMonthHighlight(index)}
            onMouseLeave={() => onMonthHighlight(null)}
            disabled={isDisabled}
            className={classNames(
              'p-2 rounded-lg text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-primary/50',
              isDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-emerald-100 text-gray-700',
              !isDisabled &&
                (isSelected
                  ? 'bg-primary text-white hover:text-primary'
                  : isHighlighted
                    ? 'bg-primary/30 text-primary-dark ring-2 ring-primary/50'
                    : '')
            )}
          >
            {monthName.substring(0, 3)}
          </button>
        );
      })}
    </div>
  );
};

export default MonthsGrid;
