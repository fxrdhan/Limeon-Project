import { memo } from 'react';
import { AGGridPagination } from '@/components/pagination';
import { PAGINATION_CONSTANTS } from '@/components/pagination/constants';
import { GridApi } from 'ag-grid-community';

interface StandardPaginationProps {
  gridApi: GridApi | null;
  onPageSizeChange?: (pageSize: number) => void;
}

const StandardPagination = memo<StandardPaginationProps>(
  function StandardPagination({ gridApi, onPageSizeChange }) {
    return (
      <AGGridPagination
        gridApi={gridApi}
        pageSizeOptions={[...PAGINATION_CONSTANTS.PAGE_SIZES]}
        enableFloating={true}
        hideFloatingWhenModalOpen={false}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
);

export default StandardPagination;
