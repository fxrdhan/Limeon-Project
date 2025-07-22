import { useState, useEffect } from 'react';
import { PAGINATION_CONSTANTS } from '../constants';
import type { UseFloatingPaginationProps, UseFloatingPaginationReturn } from '../types';

export const useFloatingPagination = ({
  enableFloating,
  containerRef,
}: UseFloatingPaginationProps): UseFloatingPaginationReturn => {
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    if (!enableFloating || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloating(!entry.isIntersecting);
      },
      {
        threshold: PAGINATION_CONSTANTS.FLOATING.THRESHOLD,
        rootMargin: PAGINATION_CONSTANTS.FLOATING.ROOT_MARGIN,
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [enableFloating, containerRef]);

  return {
    showFloating,
    setShowFloating,
  };
};