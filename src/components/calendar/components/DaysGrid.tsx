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
        className={`grid grid-cols-7 gap-1 text-center text-sm ${animated ? 'm-1' : ''}`}
      >
        {/* Day labels - show only if not animated (static version) */}
        {!animated &&
          DAY_LABELS.map(day => (
            <div key={day} className="font-medium text-gray-500 py-2 px-1">
              {day}
            </div>
          ))}
        {calendarDays.map((day, index) => {
          if (day === null)
            return <div key={`empty-${index}`} className="py-2 px-2"></div>;

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
              className={classNames(
                `py-2 px-2 min-w-[32px] min-h-[32px] rounded-lg text-sm cursor-pointer`,
                isDisabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'hover:bg-emerald-50',
                !isDisabled &&
                  (isSelected
                    ? 'bg-primary text-white hover:ring-2 hover:ring-emerald-200 hover:text-primary hover:font-semibold transition-colors duration-150'
                    : isHighlighted
                      ? 'bg-emerald-50 ring-2 ring-emerald-200'
                      : isToday
                        ? 'ring ring-emerald-200 text-primary'
                        : 'text-gray-700')
              )}
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
      <div className="text-center text-sm">{renderDatesGrid(displayDate)}</div>
    );
  }

  // Animated version
  return (
    <div className="text-center text-sm">
      {/* Static day labels header */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-1">
        {DAY_LABELS.map(day => (
          <div key={day} className="font-medium text-gray-500 py-2 px-1">
            {day}
          </div>
        ))}
      </div>

      {/* Animated dates grid */}
      <div className="relative overflow-hidden px-1 pb-1">
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
            className="w-full"
          >
            {renderDatesGrid(displayDate)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DaysGrid;
