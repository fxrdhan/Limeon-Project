import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const useTableHeightMock = vi.hoisted(() => vi.fn());
const useContainerWidthMock = vi.hoisted(() => vi.fn());
const calculateColumnWidthsMock = vi.hoisted(() => vi.fn());
const sortDataMock = vi.hoisted(() => vi.fn());
const filterDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/ag-grid/useTableHeight', () => ({
  useTableHeight: useTableHeightMock,
}));

vi.mock('@/hooks/ui/useContainerWidth', () => ({
  useContainerWidth: useContainerWidthMock,
}));

vi.mock('@/utils/table', () => ({
  calculateColumnWidths: calculateColumnWidthsMock,
  sortData: sortDataMock,
  filterData: filterDataMock,
}));

type RowData = {
  name: string;
  qty: number;
  status: string;
};

const columns = [
  { key: 'name', header: 'Name', align: 'left' as const, sortable: true },
  { key: 'qty', header: 'Qty', align: 'right' as const, sortable: true },
  {
    key: 'status',
    header: 'Status',
    align: 'center' as const,
    sortable: false,
  },
];

const data: RowData[] = [
  { name: 'Bravo', qty: 2, status: 'active' },
  { name: 'Alpha', qty: 1, status: 'inactive' },
];

const renderDynamicTable = (
  props: Partial<React.ComponentProps<typeof Table>> = {}
) => {
  const onSort = vi.fn();
  const onSearch = vi.fn();

  render(
    <Table
      columns={columns}
      data={data}
      autoSize={true}
      sortable={true}
      searchable={true}
      onSort={onSort}
      onSearch={onSearch}
      {...props}
    >
      <TableHead>
        <TableRow>
          <TableHeader>Name</TableHeader>
          <TableHeader>Qty</TableHeader>
          <TableHeader>Status</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.name}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{String(item.qty)}</TableCell>
            <TableCell>{item.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return { onSort, onSearch };
};

describe('Table components', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    useTableHeightMock.mockReset();
    useContainerWidthMock.mockReset();
    calculateColumnWidthsMock.mockReset();
    sortDataMock.mockReset();
    filterDataMock.mockReset();

    useTableHeightMock.mockReturnValue('420px');
    useContainerWidthMock.mockReturnValue({
      width: 920,
      containerRef: { current: null },
    });

    calculateColumnWidthsMock.mockReturnValue({
      name: 200,
      qty: 120,
      status: 160,
    });

    filterDataMock.mockImplementation(
      (rows: RowData[], searchState: Record<string, string>) => {
        const term = (searchState.name || '').toLowerCase().trim();
        if (!term) return [...rows];
        return rows.filter(row => row.name.toLowerCase().includes(term));
      }
    );

    sortDataMock.mockImplementation(
      (
        rows: RowData[],
        column: keyof RowData,
        direction: 'asc' | 'desc' | 'original',
        originalRows: RowData[]
      ) => {
        if (direction === 'asc') {
          return [...rows].sort((a, b) =>
            String(a[column]).localeCompare(String(b[column]))
          );
        }
        if (direction === 'desc') {
          return [...rows].sort((a, b) =>
            String(b[column]).localeCompare(String(a[column]))
          );
        }
        return [...originalRows];
      }
    );
  });

  it('renders searchable table, filters with debounce, and sorts through directions', () => {
    const { onSort, onSearch } = renderDynamicTable();

    expect(screen.getByPlaceholderText('Search name...')).toBeInTheDocument();
    expect(calculateColumnWidthsMock).toHaveBeenCalledWith(columns, data, 920);

    const nameSearch = screen.getByPlaceholderText('Search name...');
    fireEvent.change(nameSearch, { target: { value: 'alp' } });

    expect(filterDataMock).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(filterDataMock).toHaveBeenCalledTimes(2);
    expect(onSearch).toHaveBeenLastCalledWith([
      { name: 'Alpha', qty: 1, status: 'inactive' },
    ]);

    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Status'));

    expect(sortDataMock).toHaveBeenCalledTimes(2);
    expect(sortDataMock).toHaveBeenNthCalledWith(
      1,
      [{ name: 'Alpha', qty: 1, status: 'inactive' }],
      'name',
      'asc',
      data
    );
    expect(sortDataMock).toHaveBeenNthCalledWith(
      2,
      [{ name: 'Alpha', qty: 1, status: 'inactive' }],
      'name',
      'desc',
      data
    );
    expect(onSort).toHaveBeenCalled();
  });

  it('supports scrollable mode with sticky header and no search row when disabled', () => {
    renderDynamicTable({
      scrollable: true,
      stickyHeader: true,
      maxHeight: '300px',
      searchable: false,
    });

    const outer = document.querySelector(
      '.rounded-lg.border-2.border-slate-200'
    ) as HTMLElement;
    expect(outer).toBeTruthy();
    expect(outer.style.maxHeight).toBe('300px');

    const scrollRegion = document.querySelector(
      '.overflow-auto'
    ) as HTMLElement;
    expect(scrollRegion.style.maxHeight).toBe('300px');
    expect(
      screen.queryByPlaceholderText('Search name...')
    ).not.toBeInTheDocument();

    const stickyHeaders = document.querySelectorAll('th.sticky');
    expect(stickyHeaders.length).toBeGreaterThan(0);
  });

  it('respects global sortable toggle and column-level non-sortable config', () => {
    renderDynamicTable({ sortable: false });

    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Status'));

    expect(sortDataMock).not.toHaveBeenCalled();
  });

  it('applies cell widths/alignment and string title tooltip', () => {
    render(
      <table>
        <tbody>
          <TableRow
            columnWidths={{ first: 90, second: 140 }}
            columns={[
              { key: 'first', header: 'First', align: 'right' },
              { key: 'second', header: 'Second', align: 'center' },
            ]}
          >
            <TableCell>Text Cell</TableCell>
            <TableCell>
              <span>Node Cell</span>
            </TableCell>
          </TableRow>
        </tbody>
      </table>
    );

    const firstCell = screen
      .getByText('Text Cell')
      .closest('td') as HTMLTableCellElement;
    const secondCell = screen
      .getByText('Node Cell')
      .closest('td') as HTMLTableCellElement;

    expect(firstCell).toHaveClass('text-right');
    expect(firstCell.style.width).toBe('90px');
    expect(firstCell.title).toBe('Text Cell');

    expect(secondCell).toHaveClass('text-center');
    expect(secondCell.style.width).toBe('140px');
    expect(secondCell.title).toBe('');
  });

  it('renders header sort icons and emits onSort when clickable', () => {
    const onSort = vi.fn();
    const { rerender, container } = render(
      <table>
        <thead>
          <tr>
            <TableHeader
              stickyHeader={true}
              sortable={true}
              sortState={{ column: null, direction: 'original' }}
              onSort={onSort}
              columnWidths={{ name: 180 }}
              columnIndex={0}
              columns={[{ key: 'name', header: 'Name', sortable: true }]}
            >
              Name
            </TableHeader>
          </tr>
        </thead>
      </table>
    );

    const headerCell = screen
      .getByText('Name')
      .closest('th') as HTMLTableCellElement;
    expect(headerCell).toHaveClass('sticky', 'cursor-pointer');
    expect(headerCell.style.width).toBe('180px');
    expect(container.querySelector('svg.text-slate-400')).toBeTruthy();

    fireEvent.click(headerCell);
    expect(onSort).toHaveBeenCalledWith('name');

    rerender(
      <table>
        <thead>
          <tr>
            <TableHeader
              sortable={true}
              sortState={{ column: 'name', direction: 'asc' }}
              onSort={onSort}
              columnIndex={0}
              columns={[{ key: 'name', header: 'Name', sortable: true }]}
            >
              Name
            </TableHeader>
          </tr>
        </thead>
      </table>
    );
    expect(container.querySelector('svg.text-blue-600')).toBeTruthy();
  });
});
