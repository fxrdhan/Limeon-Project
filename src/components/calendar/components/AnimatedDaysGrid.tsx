import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CALENDAR_CONSTANTS, DAY_LABELS } from '../constants';
import DaysGrid from './DaysGrid';
import type { AnimatedDaysGridProps } from '../types';

const getAnimationDirection = (
  navigationDirection: 'prev' | 'next' | null,
  yearNavigationDirection: 'prev' | 'next' | null
) => {
  if (yearNavigationDirection === 'prev') return { y: '-100%', x: 0 };
  if (yearNavigationDirection === 'next') return { y: '100%', x: 0 };
  if (navigationDirection === 'prev') return { x: '-100%', y: 0 };
  if (navigationDirection === 'next') return { x: '100%', y: 0 };
  return { x: 0, y: 0 };
};

const getExitDirection = (
  navigationDirection: 'prev' | 'next' | null,
  yearNavigationDirection: 'prev' | 'next' | null
) => {
  if (yearNavigationDirection === 'prev') return { y: '100%', x: 0 };
  if (yearNavigationDirection === 'next') return { y: '-100%', x: 0 };
  if (navigationDirection === 'prev') return { x: '100%', y: 0 };
  if (navigationDirection === 'next') return { x: '-100%', y: 0 };
  return { x: 0, y: 0 };
};

const AnimatedDaysGrid: React.FC<AnimatedDaysGridProps> = ({
  displayDate,
  navigationDirection = null,
  yearNavigationDirection = null,
  ...gridProps
}) => {
  const gridKey = `${displayDate.getFullYear()}-${displayDate.getMonth()}`;
  const isGridTransitioning = Boolean(
    navigationDirection || yearNavigationDirection
  );

  return (
    <div className="calendar__animation-container">
      <div className="calendar__animation-header" aria-hidden="true">
        {DAY_LABELS.map(day => (
          <div key={day} className="calendar__day-label">
            {day}
          </div>
        ))}
      </div>

      <div
        className="calendar__animation-content"
        style={isGridTransitioning ? { pointerEvents: 'none' } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={gridKey}
            initial={
              isGridTransitioning
                ? getAnimationDirection(
                    navigationDirection,
                    yearNavigationDirection
                  )
                : false
            }
            animate={{ x: 0, y: 0 }}
            exit={getExitDirection(
              navigationDirection,
              yearNavigationDirection
            )}
            transition={{
              type: 'tween',
              ease: [0.4, 0.0, 0.2, 1],
              duration: CALENDAR_CONSTANTS.GRID_TRANSITION_DURATION / 1000,
            }}
            className="calendar__animation-grid"
          >
            <DaysGrid
              {...gridProps}
              displayDate={displayDate}
              columnHeaderMode="sr-only"
              layoutMode="animated"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnimatedDaysGrid;
