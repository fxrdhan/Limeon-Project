import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { DAY_LABELS } from '../constants';
import { useCalendarContext } from '../hooks';
import type { DaysGridProps } from '../types';

const DaysGrid: React.FC<DaysGridProps> = ({
  displayDate,
  value,
  highlightedDate,
  minDate,
  maxDate,
  onDateSelect,
  onDateHighlight,
  animated = false,
}) => {
  const { navigationDirection, yearNavigationDirection } = useCalendarContext();

  // Create unique key based on year and month for AnimatePresence
  const gridKey = `${displayDate.getFullYear()}-${displayDate.getMonth()}`;

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

    // Calculate days in month and first day
    const daysInMonth = (year: number, month: number) =>
      new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) =>
      new Date(year, month, 1).getDay();

    const numDays = daysInMonth(year, month);
    let firstDay = firstDayOfMonth(year, month);
    if (firstDay === 0) firstDay = 6;
    else firstDay -= 1;

    const calendarDays: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= numDays; i++) calendarDays.push(i);

    return (
      <div
        className={
          animated ? 'calendar-days-grid-animated' : 'calendar-days-grid-static'
        }
      >
        {/* Day labels - show only if not animated (static version) */}
        {!animated &&
          DAY_LABELS.map(day => (
            <div key={day} className="calendar-day-label">
              {day}
            </div>
          ))}
        {calendarDays.map((day, index) => {
          if (day === null)
            return (
              <div key={`empty-${index}`} className="calendar-day-empty"></div>
            );

          const currentDate = new Date(year, month, day);
          const isSelected =
            value && currentDate.toDateString() === value.toDateString();
          const isHighlighted =
            highlightedDate &&
            currentDate.toDateString() === highlightedDate.toDateString();

          let isDisabled = false;
          if (minDate) {
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            if (currentDate < min) isDisabled = true;
          }
          if (maxDate) {
            const max = new Date(maxDate);
            max.setHours(0, 0, 0, 0);
            if (currentDate > max) isDisabled = true;
          }

          const isToday =
            new Date(year, month, day).toDateString() ===
            new Date().toDateString();

          return (
            <button
              key={day}
              onClick={() => !isDisabled && onDateSelect(currentDate)}
              onMouseEnter={() => !isDisabled && onDateHighlight(currentDate)}
              onMouseLeave={() => onDateHighlight(null)}
              disabled={isDisabled}
              className={classNames('calendar-day-button', {
                'calendar-day-button-disabled': isDisabled,
                'calendar-day-button-selected': !isDisabled && isSelected,
                'calendar-day-button-highlighted':
                  !isDisabled && !isSelected && isHighlighted,
                'calendar-day-button-today':
                  !isDisabled && !isSelected && !isHighlighted && isToday,
              })}
            >
              {day}
            </button>
          );
        })}
      </div>
    );
  };

  // Render with or without animation based on prop
  if (!animated) {
    return (
      <div className="calendar-animation-container">
        {renderDatesGrid(displayDate)}
      </div>
    );
  }

  // Animated version
  return (
    <div className="calendar-animation-container">
      {/* Static day labels header */}
      <div className="calendar-animation-header">
        {DAY_LABELS.map(day => (
          <div key={day} className="calendar-day-label">
            {day}
          </div>
        ))}
      </div>

      {/* Animated dates grid */}
      <div className="calendar-animation-content">
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
              duration: 0.25,
            }}
            className="calendar-animation-grid"
          >
            {renderDatesGrid(displayDate)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DaysGrid;
