import { memo } from 'react';
import { AGGridPagination } from '@/components/pagination';
import { PAGINATION_CONSTANTS } from '@/components/pagination/constants';
import type { GridApi } from 'ag-grid-community';

interface StandardPaginationProps {
  gridApi: GridApi | null;
  onPageSizeChange?: (pageSize: number) => void;
  hideFloatingWhenModalOpen?: boolean;
}

const StandardPagination = memo<StandardPaginationProps>(
  function StandardPagination({
    gridApi,
    onPageSizeChange,
    hideFloatingWhenModalOpen = false,
  }) {
    return (
      <AGGridPagination
        gridApi={gridApi}
        pageSizeOptions={[...PAGINATION_CONSTANTS.PAGE_SIZES]}
        enableFloating={true}
        hideFloatingWhenModalOpen={hideFloatingWhenModalOpen}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
);

export default StandardPagination;
