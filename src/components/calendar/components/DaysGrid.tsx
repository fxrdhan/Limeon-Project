import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import classNames from 'classnames';
import { CALENDAR_CONSTANTS, DAY_LABELS } from '../constants';
import {
  formatAccessibleDate,
  generateCalendarDays,
  isDateInRange,
  isSameDate,
  isToday as isCalendarToday,
} from '../utils';
import type { DaysGridProps } from '../types';

const DaysGrid: React.FC<DaysGridProps> = ({
  displayDate,
  value,
  highlightedDate,
  minDate,
  maxDate,
  onDateSelect,
  onDateHighlight,
  getDayButtonId,
  navigationDirection = null,
  yearNavigationDirection = null,
  readOnly = false,
  animated = false,
}) => {
  // Create unique key based on year and month for AnimatePresence
  const gridKey = `${displayDate.getFullYear()}-${displayDate.getMonth()}`;
  const getDayCellId = (date: Date) => `${getDayButtonId(date)}-cell`;

  const getAnimationDirection = () => {
    // Year navigation (vertical)
    if (yearNavigationDirection === 'prev') {
      return { y: '-100%', x: 0 };
    } else if (yearNavigationDirection === 'next') {
      return { y: '100%', x: 0 };
    }
    // Month navigation (horizontal)
    else if (navigationDirection === 'prev') {
      return { x: '-100%', y: 0 };
    } else if (navigationDirection === 'next') {
      return { x: '100%', y: 0 };
    }
    return { x: 0, y: 0 };
  };

  const getExitDirection = () => {
    // Year navigation (vertical)
    if (yearNavigationDirection === 'prev') {
      return { y: '100%', x: 0 };
    } else if (yearNavigationDirection === 'next') {
      return { y: '-100%', x: 0 };
    }
    // Month navigation (horizontal)
    else if (navigationDirection === 'prev') {
      return { x: '100%', y: 0 };
    } else if (navigationDirection === 'next') {
      return { x: '-100%', y: 0 };
    }
    return { x: 0, y: 0 };
  };
  // Calendar calculation logic
  const renderDatesGrid = (displayDate: Date) => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const calendarDays = generateCalendarDays(year, month);
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
        tabIndex={-1}
        data-calendar-grid=""
        className={
          animated
            ? 'calendar__days-grid--animated'
            : 'calendar__days-grid--static'
        }
      >
        <div role="row" className={animated ? 'sr-only' : 'calendar__day-row'}>
          {DAY_LABELS.map(day => (
            <div
              key={day}
              role="columnheader"
              className={animated ? undefined : 'calendar__day-label'}
            >
              {day}
            </div>
          ))}
        </div>
        {calendarWeeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            role="row"
            className="calendar__day-row"
          >
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
                !readOnly && isSameDate(currentDate, highlightedDate);

              const isDisabled = !isDateInRange(currentDate, minDate, maxDate);
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
                    id={dayButtonId}
                    onClick={() =>
                      !isDisabled && !readOnly && onDateSelect(currentDate)
                    }
                    onMouseEnter={() =>
                      !isDisabled && !readOnly && onDateHighlight(currentDate)
                    }
                    onMouseLeave={() => onDateHighlight(null)}
                    disabled={isDisabled}
                    aria-label={formatAccessibleDate(currentDate)}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={isDisabled || readOnly}
                    tabIndex={-1}
                    className={classNames('calendar__day-button', {
                      'calendar__day-button--disabled': isDisabled,
                      'calendar__day-button--selected':
                        !isDisabled && isSelected,
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

  // Render with or without animation based on prop
  if (!animated) {
    return (
      <div className="calendar__animation-container">
        {renderDatesGrid(displayDate)}
      </div>
    );
  }

  // Animated version
  return (
    <div className="calendar__animation-container">
      {/* Static day labels header */}
      <div className="calendar__animation-header" aria-hidden="true">
        {DAY_LABELS.map(day => (
          <div key={day} className="calendar__day-label">
            {day}
          </div>
        ))}
      </div>

      {/* Animated dates grid */}
      <div className="calendar__animation-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={gridKey}
            initial={
              navigationDirection || yearNavigationDirection
                ? getAnimationDirection()
                : false
            }
            animate={{ x: 0, y: 0 }}
            exit={getExitDirection()}
            transition={{
              type: 'tween',
              ease: [0.4, 0.0, 0.2, 1],
              duration: CALENDAR_CONSTANTS.GRID_TRANSITION_DURATION / 1000,
            }}
            className="calendar__animation-grid"
          >
            {renderDatesGrid(displayDate)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DaysGrid;
