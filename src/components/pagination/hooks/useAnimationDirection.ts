import { useRef, useEffect, useMemo } from 'react';
import { PAGINATION_CONSTANTS } from '../constants';
import type { UseAnimationDirectionProps, UseAnimationDirectionReturn } from '../types';

export const useAnimationDirection = ({
  currentPage,
}: UseAnimationDirectionProps): UseAnimationDirectionReturn => {
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    prevPageRef.current = currentPage;
  }, [currentPage]);

  const direction = useMemo(() => {
    if (currentPage > prevPageRef.current) {
      return 1;
    } else if (currentPage < prevPageRef.current) {
      return -1;
    }
    return 0;
  }, [currentPage]);

  const variants = useMemo(() => ({
    enter: (direction: number) => ({
      x: direction > 0 ? PAGINATION_CONSTANTS.ANIMATION.ENTER_X : -PAGINATION_CONSTANTS.ANIMATION.ENTER_X,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction > 0 ? -PAGINATION_CONSTANTS.ANIMATION.EXIT_X : PAGINATION_CONSTANTS.ANIMATION.EXIT_X,
      opacity: 0,
    }),
  }), []);

  const floatingVariants = useMemo(() => ({
    initial: { 
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_INITIAL, 
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_INITIAL 
    },
    animate: {
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_ANIMATE,
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_ANIMATE,
    },
    exit: { 
      scale: PAGINATION_CONSTANTS.ANIMATION.FLOATING_SCALE_INITIAL, 
      y: PAGINATION_CONSTANTS.ANIMATION.FLOATING_Y_INITIAL 
    },
  }), []);

  return {
    direction,
    variants,
    floatingVariants,
  };
};