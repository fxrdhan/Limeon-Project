import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { DAY_LABELS } from '../constants';
import { useCalendarContext } from '../hooks';
import type { DaysGridProps } from '../types';

const AnimatedDaysGrid: React.FC<DaysGridProps> = ({
  displayDate,
  value,
  highlightedDate,
  minDate,
  maxDate,
  onDateSelect,
  onDateHighlight,
}) => {
  const { navigationDirection } = useCalendarContext();

  // Create unique key based on year and month for AnimatePresence
  const gridKey = `${displayDate.getFullYear()}-${displayDate.getMonth()}`;

  const getAnimationDirection = () => {
    if (navigationDirection === 'prev') {
      return { x: '-100%' };
    } else if (navigationDirection === 'next') {
      return { x: '100%' };
    }
    return { x: 0 };
  };

  const getExitDirection = () => {
    if (navigationDirection === 'prev') {
      return { x: '100%' };
    } else if (navigationDirection === 'next') {
      return { x: '-100%' };
    }
    return { x: 0 };
  };

  // Calendar calculation logic (extracted from DaysGrid)
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
      <div className="grid grid-cols-7 gap-1 text-center text-sm m-1">
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
                'py-2 px-2 min-w-[32px] min-h-[32px] rounded-lg text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-primary/50',
                isDisabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'hover:bg-emerald-100',
                !isDisabled &&
                  (isSelected
                    ? 'bg-primary text-white hover:text-primary hover:bg-primary'
                    : isHighlighted
                      ? 'bg-primary/30 text-primary-dark ring-2 ring-primary/50'
                      : isToday
                        ? 'border border-primary text-primary'
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
      <div className="relative overflow-x-hidden px-1 pb-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={gridKey}
            initial={navigationDirection ? getAnimationDirection() : false}
            animate={{ x: 0 }}
            exit={getExitDirection()}
            transition={{
              type: "tween",
              ease: [0.4, 0.0, 0.2, 1],
              duration: 0.25
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

export default AnimatedDaysGrid;