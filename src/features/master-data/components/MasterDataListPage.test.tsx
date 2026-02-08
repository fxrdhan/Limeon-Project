import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MasterDataListPage from './MasterDataListPage';

const capturedSearchBarProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

const capturedDataGridProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

const capturedPaginationProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

const capturedExportProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" data-classname={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/search-bar/EnhancedSearchBar', () => ({
  default: (props: Record<string, unknown>) => {
    capturedSearchBarProps.current = props;
    return (
      <input
        data-testid="search-bar"
        placeholder={props.placeholder as string}
        onKeyDown={
          props.onKeyDown as React.KeyboardEventHandler<HTMLInputElement>
        }
      />
    );
  },
}));

vi.mock('@/components/export', () => ({
  ExportDropdown: (props: Record<string, unknown>) => {
    capturedExportProps.current = props;
    return <div data-testid="export-dropdown">{String(props.filename)}</div>;
  },
}));

vi.mock('@/components/ag-grid', () => ({
  DataGrid: (props: Record<string, unknown>) => {
    capturedDataGridProps.current = props;
    return <div data-testid="data-grid">grid</div>;
  },
}));

vi.mock('@/components/pagination', () => ({
  AGGridPagination: (props: Record<string, unknown>) => {
    capturedPaginationProps.current = props;
    return <div data-testid="grid-pagination">pagination</div>;
  },
}));

const buildProps = (overrides: Record<string, unknown> = {}) => ({
  title: 'Daftar Master',
  entityName: 'Dokter',
  exportFilename: 'daftar-dokter',
  searchInputRef: { current: null },
  searchBarProps: {} as never,
  onSearchKeyDown: vi.fn(),
  onAddClick: vi.fn(),
  isFetching: true,
  isError: false,
  queryError: null,
  searchValue: 'Sari',
  gridHeight: 420,
  gridProps: {
    rowData: [{ id: '1', name: 'Sari' }],
    columnDefs: [{ field: 'name' }],
    style: { border: '1px solid red' },
  } as never,
  pagination: {
    gridApi: { id: 'grid-api' },
    pageSizeOptions: [25, 50],
    enableFloating: true,
    hideFloatingWhenModalOpen: false,
    onPageSizeChange: vi.fn(),
  },
  children: <div data-testid="modal-slot">modal</div>,
  ...overrides,
});

describe('MasterDataListPage', () => {
  beforeEach(() => {
    capturedSearchBarProps.current = null;
    capturedDataGridProps.current = null;
    capturedPaginationProps.current = null;
    capturedExportProps.current = null;
  });

  it('renders list mode with forwarding props and generated overlay template', () => {
    const props = buildProps();

    render(<MasterDataListPage {...props} />);

    expect(screen.getByText('Daftar Master')).toBeInTheDocument();
    expect(screen.getByTestId('modal-slot')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveAttribute(
      'data-classname',
      'opacity-75 transition-opacity duration-300 flex-1 flex flex-col'
    );

    fireEvent.keyDown(screen.getByTestId('search-bar'), { key: 'Enter' });
    expect(props.onSearchKeyDown).toHaveBeenCalledTimes(1);
    expect(capturedSearchBarProps.current?.className).toBe('grow');
    expect(capturedSearchBarProps.current?.placeholder).toContain(
      'Cari di semua kolom'
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Tambah Dokter Baru/i })
    );
    expect(props.onAddClick).toHaveBeenCalledTimes(1);

    expect(capturedExportProps.current).toEqual({
      gridApi: props.pagination.gridApi,
      filename: 'daftar-dokter',
    });

    expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    expect(screen.getByTestId('grid-pagination')).toBeInTheDocument();
    expect(capturedDataGridProps.current?.overlayNoRowsTemplate).toContain(
      'Tidak ada dokter dengan nama "Sari"'
    );
    expect(capturedDataGridProps.current?.style).toMatchObject({
      width: '100%',
      marginTop: '1rem',
      marginBottom: '1rem',
      transition: 'height 0.3s ease-in-out',
      border: '1px solid red',
      height: '420px',
    });

    expect(capturedPaginationProps.current).toEqual({
      gridApi: props.pagination.gridApi,
      pageSizeOptions: [25, 50],
      enableFloating: true,
      hideFloatingWhenModalOpen: false,
      onPageSizeChange: props.pagination.onPageSizeChange,
    });
  });

  it('shows error text and skips grid/pagination when query fails', () => {
    render(
      <MasterDataListPage
        {...buildProps({
          isFetching: false,
          isError: true,
          queryError: new Error('Boom'),
        })}
      />
    );

    expect(screen.getByText('Error: Boom')).toBeInTheDocument();
    expect(screen.queryByTestId('data-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-pagination')).not.toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveAttribute(
      'data-classname',
      'flex-1 flex flex-col'
    );
  });

  it('uses fallback error text and respects custom no-rows template + placeholder override', () => {
    const firstRender = render(
      <MasterDataListPage
        {...buildProps({
          isFetching: false,
          isError: true,
          queryError: null,
        })}
      />
    );
    expect(screen.getByText('Error: Gagal memuat data')).toBeInTheDocument();
    firstRender.unmount();

    render(
      <MasterDataListPage
        {...buildProps({
          isFetching: false,
          searchValue: '',
          searchPlaceholder: 'Cari nama master data',
          isError: false,
          gridProps: {
            rowData: [],
            columnDefs: [],
            overlayNoRowsTemplate: '<span>Custom Empty</span>',
          } as never,
        })}
      />
    );

    expect(capturedSearchBarProps.current?.placeholder).toBe(
      'Cari nama master data'
    );
    expect(capturedDataGridProps.current?.overlayNoRowsTemplate).toBe(
      '<span>Custom Empty</span>'
    );
  });
});
