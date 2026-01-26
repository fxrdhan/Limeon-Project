import { useRef, useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { GridApi } from 'ag-grid-community';
import { useFloatingPagination, useAnimationDirection } from './hooks';
import { PaginationProvider } from './providers';
import { PaginationContent, FloatingWrapper } from './components';
import type { PaginationContextValue } from './types';

interface AGGridPaginationProps {
  gridApi: GridApi | null;
  className?: string;
  enableFloating?: boolean;
  hideFloatingWhenModalOpen?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Optimized AGGridPagination using AG Grid events for automatic updates
 */
const AGGridPagination: React.FC<AGGridPaginationProps> = ({
  gridApi,
  className,
  enableFloating = true,
  hideFloatingWhenModalOpen = false,
  pageSizeOptions = [20, 50, 100, -1],
  onPageSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paginationState, setPaginationState] = useState(0);

  // ALWAYS call hooks first
  const { showFloating } = useFloatingPagination({
    enableFloating,
    containerRef,
  });

  // Default values when no grid API
  const isPaginationEnabled =
    gridApi && !gridApi.isDestroyed()
      ? gridApi.getGridOption('pagination')
      : true;

  const currentPage =
    gridApi && !gridApi.isDestroyed() && isPaginationEnabled
      ? gridApi.paginationGetCurrentPage() + 1
      : 1;

  const { direction } = useAnimationDirection({
    currentPage,
  });

  // Optimized handlers using AG Grid API (defined before early return)
  const handlePageChange = useCallback(
    (page: number) => {
      if (!gridApi || gridApi.isDestroyed() || page === currentPage) return;

      const totalPages = gridApi.paginationGetTotalPages();
      if (page === 1) {
        gridApi.paginationGoToFirstPage();
      } else if (page === totalPages) {
        gridApi.paginationGoToLastPage();
      } else {
        gridApi.paginationGoToPage(page - 1);
      }
    },
    [gridApi, currentPage]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      if (!gridApi || gridApi.isDestroyed()) return;

      const isPaginationCurrentlyEnabled = gridApi.getGridOption('pagination');
      const currentPageSize = isPaginationCurrentlyEnabled
        ? gridApi.paginationGetPageSize()
        : -1;

      // Skip if same state: both unlimited or both same numbered page size
      if (newPageSize === currentPageSize) return;

      // Handle unlimited items (-1) by disabling pagination
      if (newPageSize === -1) {
        gridApi.setGridOption('pagination', false);
      } else {
        // Enable pagination and set page size
        gridApi.setGridOption('pagination', true);
        gridApi.setGridOption('paginationPageSize', newPageSize);
      }

      // Call the callback to notify parent component
      if (onPageSizeChange) {
        onPageSizeChange(newPageSize);
      }
    },
    [gridApi, onPageSizeChange]
  );

  const handleItemsPerPageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newPageSize = Number(event.target.value);
      handlePageSizeChange(newPageSize);
    },
    [handlePageSizeChange]
  );

  const handleItemsPerPageClick = useCallback(
    (value: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handlePageSizeChange(value);
    },
    [handlePageSizeChange]
  );

  // Listen to AG Grid pagination events for automatic updates
  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) return;

    const handlePaginationChanged = () => {
      setPaginationState(prev => prev + 1);
    };

    gridApi.addEventListener('paginationChanged', handlePaginationChanged);

    return () => {
      if (!gridApi.isDestroyed()) {
        gridApi.removeEventListener(
          'paginationChanged',
          handlePaginationChanged
        );
      }
    };
  }, [gridApi]);

  // Check grid API after hooks
  if (!gridApi || gridApi.isDestroyed()) {
    return null;
  }

  // Get values from grid API
  const totalPages = isPaginationEnabled
    ? gridApi.paginationGetTotalPages()
    : 1;
  const itemsPerPage = isPaginationEnabled
    ? gridApi.paginationGetPageSize()
    : -1;
  const effectivePageSizes = pageSizeOptions.includes(itemsPerPage)
    ? pageSizeOptions
    : [...pageSizeOptions, itemsPerPage].sort((a, b) => {
        if (a === -1) return 1;
        if (b === -1) return -1;
        return a - b;
      });
  const selectedPageSizeIndex = effectivePageSizes.indexOf(itemsPerPage);

  // Context value
  const contextValue: PaginationContextValue = {
    currentPage,
    totalPages,
    itemsPerPage,
    showFloating,
    selectedPageSizeIndex,
    direction,
    enableFloating,
    hideFloatingWhenModalOpen,
    className,
    pageSizes: effectivePageSizes,
    onPageChange: handlePageChange,
    onItemsPerPageChange: handleItemsPerPageChange,
    handleItemsPerPageClick,
  };

  return (
    <PaginationProvider value={contextValue} key={paginationState}>
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

export default AGGridPagination;
