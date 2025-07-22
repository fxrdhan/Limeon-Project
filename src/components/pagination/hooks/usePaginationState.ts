import { useState, useEffect, useCallback, useMemo } from 'react';
import { PAGINATION_CONSTANTS } from '../constants';
import type { UsePaginationStateProps, UsePaginationStateReturn } from '../types';

export const usePaginationState = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: UsePaginationStateProps): UsePaginationStateReturn => {
  const [selectedPageSizeIndex, setSelectedPageSizeIndex] = useState(0);
  
  const pageSizes = useMemo(() => [...PAGINATION_CONSTANTS.PAGE_SIZES], []);

  useEffect(() => {
    const currentIndex = pageSizes.findIndex(size => size === itemsPerPage);
    setSelectedPageSizeIndex(currentIndex !== -1 ? currentIndex : 0);
  }, [itemsPerPage, pageSizes]);

  const handleItemsPerPageClick = useCallback(
    (value: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (value !== itemsPerPage) {
        onItemsPerPageChange({
          target: { value: value.toString() },
        } as React.ChangeEvent<HTMLSelectElement>);
      }
    },
    [itemsPerPage, onItemsPerPageChange],
  );

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    handleItemsPerPageClick,
    selectedPageSizeIndex,
    pageSizes,
  };
};