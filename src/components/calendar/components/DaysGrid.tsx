import React from 'react';
import classNames from 'classnames';
import { DAY_LABELS } from '../constants';
import {
  formatAccessibleDate,
  generateCalendarDays,
  isDateInRange,
  isSameDate,
  isToday as isCalendarToday,
} from '../utils';
import type { DaysGridProps } from '../types';

type DaysGridLayoutProps = DaysGridProps & {
  columnHeaderMode?: 'visible' | 'sr-only';
  layoutMode?: 'static' | 'animated';
};

const DaysGrid: React.FC<DaysGridLayoutProps> = ({
  displayDate,
  value,
  highlightedDate,
  minDate,
  maxDate,
  onDateSelect,
  onDateHighlight,
  getDayButtonId,
  gridTabIndex = -1,
  onGridKeyDown,
  readOnly = false,
  disabled = false,
  fixedWeekCount = false,
  columnHeaderMode = 'visible',
  layoutMode = 'static',
}) => {
  const getDayCellId = (date: Date) => `${getDayButtonId(date)}-cell`;
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const calendarDays = generateCalendarDays(year, month, { fixedWeekCount });
  const calendarWeeks = Array.from(
    { length: Math.ceil(calendarDays.length / 7) },
    (_, weekIndex) => calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7)
  );
  const activeDescendant =
    highlightedDate?.getFullYear() === year &&
    highlightedDate.getMonth() === month
      ? getDayCellId(highlightedDate)
      : undefined;

  return (
    <div
      role="grid"
      aria-label={displayDate.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      })}
      aria-activedescendant={activeDescendant}
      tabIndex={gridTabIndex}
      data-calendar-grid=""
      onKeyDown={onGridKeyDown}
      className={
        layoutMode === 'animated'
          ? 'calendar__days-grid--animated'
          : 'calendar__days-grid--static'
      }
    >
      <div
        role="row"
        className={
          columnHeaderMode === 'sr-only' ? 'sr-only' : 'calendar__day-row'
        }
      >
        {DAY_LABELS.map(day => (
          <div
            key={day}
            role="columnheader"
            className={
              columnHeaderMode === 'sr-only' ? undefined : 'calendar__day-label'
            }
          >
            {day}
          </div>
        ))}
      </div>
      {calendarWeeks.map((week, weekIndex) => (
        <div key={`week-${weekIndex}`} role="row" className="calendar__day-row">
          {week.map((day, dayIndex) => {
            const cellKey = `${weekIndex}-${dayIndex}`;

            if (day === null) {
              return (
                <div
                  key={`empty-${cellKey}`}
                  role="gridcell"
                  aria-hidden="true"
                  className="calendar__day-empty"
                ></div>
              );
            }

            const currentDate = new Date(year, month, day);
            const dayButtonId = getDayButtonId(currentDate);
            const dayCellId = getDayCellId(currentDate);
            const isSelected = isSameDate(currentDate, value);
            const isHighlighted =
              !readOnly &&
              !disabled &&
              isSameDate(currentDate, highlightedDate);

            const isDisabled = !isDateInRange(currentDate, minDate, maxDate);
            const isButtonDisabled = isDisabled || readOnly || disabled;
            const isToday = isCalendarToday(currentDate);

            return (
              <div
                key={day}
                id={dayCellId}
                role="gridcell"
                aria-selected={isSelected}
                className="calendar__day-cell"
              >
                <button
                  type="button"
                  id={dayButtonId}
                  onClick={() => {
                    if (!isButtonDisabled) onDateSelect(currentDate);
                  }}
                  onMouseEnter={() => {
                    if (!isButtonDisabled) onDateHighlight(currentDate);
                  }}
                  onMouseLeave={() => onDateHighlight(null)}
                  disabled={isButtonDisabled}
                  aria-label={formatAccessibleDate(currentDate)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-disabled={isButtonDisabled}
                  tabIndex={-1}
                  className={classNames('calendar__day-button', {
                    'calendar__day-button--disabled': isDisabled,
                    'calendar__day-button--selected': !isDisabled && isSelected,
                    'calendar__day-button--highlighted':
                      !isDisabled && !isSelected && isHighlighted,
                    'calendar__day-button--today':
                      !isDisabled && !isSelected && !isHighlighted && isToday,
                  })}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default DaysGrid;
