import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PAGINATION_CONSTANTS } from '../constants';
import type { CurrentPageDisplayProps } from '../types';

export const CurrentPageDisplay: React.FC<CurrentPageDisplayProps> = ({
  currentPage,
  direction,
  isFloating = false,
}) => {
  const variants = {
    enter: (direction: number) => ({
      x:
        direction > 0
          ? PAGINATION_CONSTANTS.ANIMATION.PAGE_SWAP_X
          : -PAGINATION_CONSTANTS.ANIMATION.PAGE_SWAP_X,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x:
        direction > 0
          ? -PAGINATION_CONSTANTS.ANIMATION.PAGE_SWAP_X
          : PAGINATION_CONSTANTS.ANIMATION.PAGE_SWAP_X,
      opacity: 0,
    }),
  };

  return (
    <div className="relative flex items-center justify-center min-w-8 h-8 rounded-full bg-primary text-white font-medium shadow-xs px-3 mx-1 overflow-hidden select-none">
      <span className="invisible select-none" aria-hidden="true">
        {currentPage}
      </span>
      <AnimatePresence initial={false} custom={direction}>
        <motion.span
          key={`${currentPage}-${isFloating ? 'floating' : 'main'}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: 'spring',
            stiffness: PAGINATION_CONSTANTS.ANIMATION.PAGE_SPRING_STIFFNESS,
            damping: PAGINATION_CONSTANTS.ANIMATION.PAGE_SPRING_DAMPING,
          }}
          className="absolute inset-0 flex items-center justify-center select-none"
        >
          {currentPage}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
