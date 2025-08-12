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
}

/**
 * Optimized AGGridPagination using AG Grid events for automatic updates
 */
const AGGridPagination: React.FC<AGGridPaginationProps> = ({
  gridApi,
  className,
  enableFloating = true,
  hideFloatingWhenModalOpen = false,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paginationState, setPaginationState] = useState(0);

  // ALWAYS call hooks first
  const { showFloating } = useFloatingPagination({
    enableFloating,
    containerRef,
  });

  // Default values when no grid API
  const currentPage = gridApi && !gridApi.isDestroyed() 
    ? gridApi.paginationGetCurrentPage() + 1 
    : 1;

  const { direction } = useAnimationDirection({
    currentPage,
  });
  
  // Optimized handlers using AG Grid API (defined before early return)
  const handlePageChange = useCallback((page: number) => {
    if (!gridApi || gridApi.isDestroyed() || page === currentPage) return;
    
    const totalPages = gridApi.paginationGetTotalPages();
    if (page === 1) {
      gridApi.paginationGoToFirstPage();
    } else if (page === totalPages) {
      gridApi.paginationGoToLastPage();
    } else {
      gridApi.paginationGoToPage(page - 1);
    }
  }, [gridApi, currentPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (!gridApi || gridApi.isDestroyed()) return;
    
    const currentPageSize = gridApi.paginationGetPageSize();
    if (newPageSize === currentPageSize) return;
    
    gridApi.setGridOption('paginationPageSize', newPageSize);
  }, [gridApi]);

  const handleItemsPerPageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(event.target.value);
    handlePageSizeChange(newPageSize);
  }, [handlePageSizeChange]);

  const handleItemsPerPageClick = useCallback((value: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handlePageSizeChange(value);
  }, [handlePageSizeChange]);
  
  // Listen to AG Grid pagination events for automatic updates
  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) return;
    
    const handlePaginationChanged = () => {
      setPaginationState(prev => prev + 1);
    };
    
    gridApi.addEventListener('paginationChanged', handlePaginationChanged);
    
    return () => {
      if (!gridApi.isDestroyed()) {
        gridApi.removeEventListener('paginationChanged', handlePaginationChanged);
      }
    };
  }, [gridApi]);

  // Check grid API after hooks
  if (!gridApi || gridApi.isDestroyed()) {
    return null;
  }

  // Get values from grid API
  const totalPages = gridApi.paginationGetTotalPages();
  const itemsPerPage = gridApi.paginationGetPageSize();
  const selectedPageSizeIndex = pageSizeOptions.indexOf(itemsPerPage);

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
    pageSizes: pageSizeOptions,
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