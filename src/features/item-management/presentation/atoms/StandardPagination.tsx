import { memo } from 'react';
import { AGGridPagination } from '@/components/pagination';
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
        pageSizeOptions={[10, 20, 50, 100]}
        enableFloating={true}
        hideFloatingWhenModalOpen={false}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
);

export default StandardPagination;
