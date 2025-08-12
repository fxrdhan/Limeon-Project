import React, { useRef, useState } from 'react';
import classNames from 'classnames';
import {
  usePaginationState,
  useFloatingPagination,
  useKeyboardNavigation,
  useAnimationDirection,
} from './hooks';
import { PaginationProvider } from './providers';
import { PaginationContent, FloatingWrapper } from './components';
import type { FloatingPaginationProps, PaginationContextValue } from './types';

const Pagination: React.FC<FloatingPaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className,
  enableFloating = true,
  hideFloatingWhenModalOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPageSizeIndex, setSelectedPageSizeIndex] = useState(0);

  // Custom hooks for different concerns
  const paginationState = usePaginationState({
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
  });

  const { showFloating } = useFloatingPagination({
    enableFloating,
    containerRef,
  });

  const { direction } = useAnimationDirection({
    currentPage,
  });

  // Update selectedPageSizeIndex when it changes from the state hook
  React.useEffect(() => {
    setSelectedPageSizeIndex(paginationState.selectedPageSizeIndex);
  }, [paginationState.selectedPageSizeIndex]);

  useKeyboardNavigation({
    showFloating,
    hideFloatingWhenModalOpen,
    selectedPageSizeIndex,
    pageSizes: paginationState.pageSizes,
    currentPage,
    totalPages,
    onItemsPerPageChange,
    onPageChange,
    setSelectedPageSizeIndex,
  });

  // Context value
  const contextValue: PaginationContextValue = {
    ...paginationState,
    showFloating,
    selectedPageSizeIndex,
    direction,
    enableFloating,
    hideFloatingWhenModalOpen,
    className,
  };

  return (
    <PaginationProvider value={contextValue}>
      <div
        ref={containerRef}
        className={classNames(
          'transition-opacity duration-200',
          showFloating && !hideFloatingWhenModalOpen
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100'
        )}
      >
        <PaginationContent />
      </div>

      {enableFloating && (
        <FloatingWrapper
          show={showFloating}
          hideWhenModalOpen={hideFloatingWhenModalOpen}
        >
          <PaginationContent isFloating />
        </FloatingWrapper>
      )}
    </PaginationProvider>
  );
};

export default Pagination;
export { default as AGGridPagination } from './AGGridPagination';
