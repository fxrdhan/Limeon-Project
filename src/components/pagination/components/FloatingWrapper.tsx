import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PAGINATION_CONSTANTS } from '../constants';
import type { FloatingWrapperProps } from '../types';

export const FloatingWrapper: React.FC<FloatingWrapperProps> = ({
  children,
  show,
  hideWhenModalOpen,
}) => {
  const floatingVariants = {
    initial: {
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_INITIAL,
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_INITIAL,
    },
    animate: {
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_ANIMATE,
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_ANIMATE,
    },
    exit: {
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_INITIAL,
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_INITIAL,
    },
  };

  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[${PAGINATION_CONSTANTS.FLOATING.Z_INDEX}] flex items-end justify-center pb-8 pointer-events-none`}
    >
      <AnimatePresence>
        {show && !hideWhenModalOpen && (
          <motion.div
            key="floating-pagination"
            variants={floatingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              type: 'spring',
              stiffness:
                PAGINATION_CONSTANTS.ANIMATION.FLOATING_SPRING_STIFFNESS,
              damping: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SPRING_DAMPING,
              duration: PAGINATION_CONSTANTS.ANIMATION.SPRING_DURATION,
            }}
            className="pointer-events-auto"
            onClick={e => e.stopPropagation()}
            style={{
              backfaceVisibility: 'hidden',
              perspective: 1000,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};
