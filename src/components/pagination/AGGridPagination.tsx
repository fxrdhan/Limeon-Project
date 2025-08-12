import { useRef, useState } from 'react';
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
 * Ultra simple AGGridPagination - no state, no effects, just direct API calls
 */
const AGGridPagination: React.FC<AGGridPaginationProps> = ({
  gridApi,
  className,
  enableFloating = true,
  hideFloatingWhenModalOpen = false,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [updateKey, setUpdateKey] = useState(0);

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

  // Check grid API after hooks
  if (!gridApi || gridApi.isDestroyed()) {
    return null;
  }

  // Get values from grid API
  const totalPages = gridApi.paginationGetTotalPages();
  const itemsPerPage = gridApi.paginationGetPageSize();
  const selectedPageSizeIndex = pageSizeOptions.indexOf(itemsPerPage);

  // Handlers with manual re-render trigger
  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    
    if (page === 1) {
      gridApi.paginationGoToFirstPage();
    } else if (page === totalPages) {
      gridApi.paginationGoToLastPage();
    } else {
      gridApi.paginationGoToPage(page - 1);
    }
    
    // Force re-render after change
    setTimeout(() => setUpdateKey(prev => prev + 1), 100);
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(event.target.value);
    if (newPageSize === itemsPerPage) return;
    
    gridApi.setGridOption('paginationPageSize', newPageSize);
    
    // Force re-render after change
    setTimeout(() => setUpdateKey(prev => prev + 1), 100);
  };

  const handleItemsPerPageClick = (value: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (value === itemsPerPage) return;
    
    gridApi.setGridOption('paginationPageSize', value);
    
    // Force re-render after change
    setTimeout(() => setUpdateKey(prev => prev + 1), 100);
  };

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
    <PaginationProvider value={contextValue} key={updateKey}>
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