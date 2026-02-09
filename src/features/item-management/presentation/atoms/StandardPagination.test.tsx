import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PAGINATION_CONSTANTS } from '@/components/pagination/constants';
import StandardPagination from './StandardPagination';

const { mockAGGridPagination } = vi.hoisted(() => ({
  mockAGGridPagination: vi.fn(),
}));

vi.mock('@/components/pagination', () => ({
  AGGridPagination: (props: Record<string, unknown>) => {
    mockAGGridPagination(props);
    return <div data-testid="ag-grid-pagination" />;
  },
}));

describe('StandardPagination', () => {
  it('passes expected props to AGGridPagination', () => {
    const onPageSizeChange = vi.fn();

    render(
      <StandardPagination gridApi={null} onPageSizeChange={onPageSizeChange} />
    );

    expect(screen.getByTestId('ag-grid-pagination')).toBeInTheDocument();
    expect(mockAGGridPagination).toHaveBeenCalledTimes(1);
    expect(mockAGGridPagination).toHaveBeenCalledWith({
      gridApi: null,
      pageSizeOptions: [...PAGINATION_CONSTANTS.PAGE_SIZES],
      enableFloating: true,
      hideFloatingWhenModalOpen: false,
      onPageSizeChange,
    });
  });
});
