import classNames from 'classnames';
import type { TableCellProps, TableRowProps, TableProps } from '@/types';
import { memo, useMemo, useRef, useState, useEffect } from 'react';
import React from 'react';
import { useTableHeight } from '@/hooks/ag-grid/useTableHeight';
import {
  TbArrowsUpDown,
  TbChevronDown,
  TbChevronUp,
  TbSearch,
} from 'react-icons/tb';
import { useContainerWidth } from '@/hooks/ui/useContainerWidth';
import { calculateColumnWidths, sortData, filterData } from '@/utils/table';
import type { ColumnConfig, SortState } from '@/types/table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableData = any;

type DynamicTableProps = TableProps & {
  columns?: ColumnConfig[];
  data?: TableData[];
  autoSize?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  onSort?: (data: TableData[]) => void;
  onSearch?: (data: TableData[]) => void;
};

export const Table = memo(
  ({
    children,
    className,
    scrollable = false,
    maxHeight,
    stickyHeader = false,
    columns,
    data,
    autoSize = false,
    sortable = true,
    searchable = true,
    onSort,
    onSearch,
  }: DynamicTableProps) => {
    const dynamicHeight = useTableHeight(320);
    const tableMaxHeight = scrollable ? maxHeight || dynamicHeight : undefined;
    const { width: containerWidth, containerRef } = useContainerWidth();
    const originalDataRef = useRef<TableData[]>([]);
    const [sortState, setSortState] = useState<SortState>({
      column: null,
      direction: 'original',
    });
    const [sortedData, setSortedData] = useState<TableData[]>(data || []);
    const searchStateRef = useRef<Record<string, string>>({});
    const [filteredData, setFilteredData] = useState<TableData[]>(data || []);
    const [searchTrigger, setSearchTrigger] = useState(0);

    // Update original data ref when data changes
    useEffect(() => {
      if (data && data.length > 0) {
        originalDataRef.current = [...data];
      }
    }, [data]);

    useEffect(() => {
      if (data) {
        const filtered = filterData(
          data,
          searchStateRef.current,
          columns || []
        );
        setFilteredData(filtered);
        onSearch?.(filtered);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, columns, searchTrigger]);

    useEffect(() => {
      if (filteredData) {
        if (sortState.column && sortState.direction !== 'original') {
          const sorted = sortData(
            filteredData,
            sortState.column,
            sortState.direction,
            originalDataRef.current
          );
          setSortedData(sorted);
          onSort?.(sorted);
        } else {
          setSortedData([...filteredData]);
          onSort?.(filteredData);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredData, sortState]);

    const handleSort = (columnKey: string) => {
      if (!sortable) return;

      const column = columns?.find(col => col.key === columnKey);
      if (column?.sortable === false) return;

      setSortState(prev => {
        if (prev.column !== columnKey) {
          return { column: columnKey, direction: 'asc' };
        }

        const nextDirection =
          prev.direction === 'asc'
            ? 'desc'
            : prev.direction === 'desc'
              ? 'original'
              : 'asc';
        return { column: columnKey, direction: nextDirection };
      });
    };

    const columnWidths = useMemo(() => {
      if (autoSize && columns && sortedData && sortedData.length > 0) {
        return calculateColumnWidths(columns, sortedData, containerWidth);
      }
      return {};
    }, [columns, sortedData, autoSize, containerWidth]);

    const SearchInput = memo(
      ({
        columnKey,
        columnHeader,
      }: {
        columnKey: string;
        columnHeader: string;
      }) => {
        const [localValue, setLocalValue] = useState<string>('');
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);

        const handleChange = (value: string) => {
          setLocalValue(value);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            searchStateRef.current = {
              ...searchStateRef.current,
              [columnKey]: value,
            };
            // Trigger re-filter
            setSearchTrigger(prev => prev + 1);
          }, 300);
        };

        useEffect(() => {
          return () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
          };
        }, []);

        return (
          <div className="relative">
            <TbSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localValue}
              onChange={e => handleChange(e.target.value)}
              placeholder={`Search ${columnHeader.toLowerCase()}...`}
              className="w-full pl-8 pr-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
      }
    );
    SearchInput.displayName = 'SearchInput';

    const SearchBar = () => {
      if (!searchable || !columns) return null;

      return (
        <tr>
          {columns.map((column, index) => (
            <td
              key={column.key}
              className="py-2 px-2 border-b border-gray-200 bg-gray-50"
              style={
                columnWidths && Object.keys(columnWidths).length > 0
                  ? {
                      width: Object.values(columnWidths)[index] + 'px',
                      minWidth: Object.values(columnWidths)[index] + 'px',
                      maxWidth: Object.values(columnWidths)[index] + 'px',
                    }
                  : {}
              }
            >
              <SearchInput
                columnKey={column.key}
                columnHeader={column.header}
              />
            </td>
          ))}
        </tr>
      );
    };

    if (scrollable) {
      return (
        <div
          ref={containerRef}
          className={classNames(
            'w-full rounded-lg border-2 border-gray-200 overflow-hidden',
            className
          )}
          style={{
            maxHeight: tableMaxHeight,
            // Removed fixed height - let content determine natural height
          }}
        >
          <div className="overflow-auto" style={{ maxHeight: tableMaxHeight }}>
            <table className="w-full table-fixed bg-white min-w-full">
              {React.Children.map(children, child => {
                if (React.isValidElement(child) && child.type === TableHead) {
                  return (
                    <>
                      {React.cloneElement(
                        child as React.ReactElement<{
                          stickyHeader?: boolean;
                          columnWidths?: Record<string, number>;
                          sortable?: boolean;
                          sortState?: SortState;
                          onSort?: (columnKey: string) => void;
                          columns?: ColumnConfig[];
                        }>,
                        {
                          stickyHeader,
                          columnWidths,
                          sortable,
                          sortState,
                          onSort: handleSort,
                          columns,
                        }
                      )}
                      {searchable && (
                        <thead className="bg-gray-50">
                          <SearchBar />
                        </thead>
                      )}
                    </>
                  );
                }
                if (React.isValidElement(child) && child.type === TableBody) {
                  return React.cloneElement(
                    child as React.ReactElement<{
                      columnWidths?: Record<string, number>;
                      columns?: ColumnConfig[];
                    }>,
                    { columnWidths, columns }
                  );
                }
                return child;
              })}
            </table>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={classNames(
          'w-full overflow-hidden rounded-lg shadow-xs border-2 border-gray-200',
          className
        )}
      >
        <table className="w-full table-fixed bg-white min-w-full">
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && child.type === TableHead) {
              return (
                <>
                  {React.cloneElement(
                    child as React.ReactElement<{
                      stickyHeader?: boolean;
                      columnWidths?: Record<string, number>;
                      sortable?: boolean;
                      sortState?: SortState;
                      onSort?: (columnKey: string) => void;
                      columns?: ColumnConfig[];
                    }>,
                    {
                      stickyHeader,
                      columnWidths,
                      sortable,
                      sortState,
                      onSort: handleSort,
                      columns,
                    }
                  )}
                  {searchable && (
                    <thead className="bg-gray-50">
                      <SearchBar />
                    </thead>
                  )}
                </>
              );
            }
            if (React.isValidElement(child) && child.type === TableBody) {
              return React.cloneElement(
                child as React.ReactElement<{
                  columnWidths?: Record<string, number>;
                  columns?: ColumnConfig[];
                }>,
                { columnWidths, columns }
              );
            }
            return child;
          })}
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

export const TableHead = ({
  children,
  className,
  stickyHeader,
  columnWidths,
  sortable,
  sortState,
  onSort,
  columns,
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  columnWidths?: Record<string, number>;
  sortable?: boolean;
  sortState?: SortState;
  onSort?: (columnKey: string) => void;
  columns?: ColumnConfig[];
}) => {
  return (
    <thead
      className={classNames(
        'text-gray-700 border-b-2 border-gray-200 group',
        {
          'sticky top-0 z-20 bg-gray-200': stickyHeader,
        },
        className
      )}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TableRow) {
          return React.cloneElement(
            child as React.ReactElement<{ children: React.ReactNode }>,
            {
              children: React.Children.map(
                (child as React.ReactElement<{ children: React.ReactNode }>)
                  .props.children,
                (headerChild, index) => {
                  if (
                    React.isValidElement(headerChild) &&
                    headerChild.type === TableHeader
                  ) {
                    return React.cloneElement(
                      headerChild as React.ReactElement<{
                        stickyHeader?: boolean;
                        columnWidths?: Record<string, number>;
                        columnIndex?: number;
                        sortable?: boolean;
                        sortState?: SortState;
                        onSort?: (columnKey: string) => void;
                        columns?: ColumnConfig[];
                      }>,
                      {
                        stickyHeader,
                        columnWidths,
                        columnIndex: index,
                        sortable,
                        sortState,
                        onSort,
                        columns,
                      }
                    );
                  }
                  return headerChild;
                }
              ),
            }
          );
        }
        return child;
      })}
    </thead>
  );
};

export const TableBody = ({
  children,
  className,
  columnWidths,
  columns,
}: {
  children: React.ReactNode;
  className?: string;
  columnWidths?: Record<string, number>;
  columns?: ColumnConfig[];
}) => {
  return (
    <tbody
      className={classNames('divide-y divide-gray-200 bg-white', className)}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === TableRow) {
          return React.cloneElement(
            child as React.ReactElement<{
              columnWidths?: Record<string, number>;
              columns?: ColumnConfig[];
            }>,
            { columnWidths, columns }
          );
        }
        return child;
      })}
    </tbody>
  );
};

export const TableRow = memo(
  ({
    children,
    className,
    columnWidths,
    columns,
    ...props
  }: TableRowProps & {
    columnWidths?: Record<string, number>;
    columns?: ColumnConfig[];
  }) => {
    return (
      <tr
        className={classNames(
          'transition-colors duration-150 hover:bg-gray-50 even:bg-gray-50/30 group',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === TableCell) {
            return React.cloneElement(
              child as React.ReactElement<{
                columnWidths?: Record<string, number>;
                columnIndex?: number;
                columns?: ColumnConfig[];
              }>,
              { columnWidths, columnIndex: index, columns }
            );
          }
          return child;
        })}
      </tr>
    );
  }
);
TableRow.displayName = 'TableRow';

export const TableCell = memo(
  ({
    children,
    className,
    colSpan,
    columnWidths,
    columnIndex,
    columns,
    ...props
  }: TableCellProps & {
    columnWidths?: Record<string, number>;
    columnIndex?: number;
    columns?: ColumnConfig[];
  }) => {
    const dynamicStyle = useMemo(() => {
      if (
        columnWidths &&
        columnIndex !== undefined &&
        Object.keys(columnWidths).length > 0
      ) {
        const width = Object.values(columnWidths)[columnIndex];
        return {
          width: width + 'px',
          minWidth: width + 'px',
          maxWidth: width + 'px',
        };
      }
      return {};
    }, [columnWidths, columnIndex]);

    const alignmentClass = useMemo(() => {
      if (columns && columnIndex !== undefined && columns[columnIndex]) {
        const align = columns[columnIndex].align;
        switch (align) {
          case 'center':
            return 'text-center';
          case 'right':
            return 'text-right';
          case 'left':
          default:
            return 'text-left';
        }
      }
      return '';
    }, [columns, columnIndex]);

    return (
      <td
        colSpan={colSpan}
        className={classNames(
          'text-sm py-3 px-2 text-gray-700 align-middle relative',
          'overflow-hidden whitespace-nowrap text-ellipsis',
          'group-hover:whitespace-normal group-hover:text-ellipsis-none group-hover:overflow-visible',
          'max-h-[50px] group-hover:max-h-[400px]',
          alignmentClass,
          className
        )}
        style={dynamicStyle}
        title={typeof children === 'string' ? children : undefined}
        {...props}
      >
        <div className="overflow-hidden text-ellipsis group-hover:overflow-visible">
          {children}
        </div>
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';

export const TableHeader = ({
  children,
  className,
  stickyHeader,
  columnWidths,
  columnIndex,
  sortable,
  sortState,
  onSort,
  columns,
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  columnWidths?: Record<string, number>;
  columnIndex?: number;
  sortable?: boolean;
  sortState?: SortState;
  onSort?: (columnKey: string) => void;
  columns?: ColumnConfig[];
}) => {
  const dynamicStyle = useMemo(() => {
    if (
      columnWidths &&
      columnIndex !== undefined &&
      Object.keys(columnWidths).length > 0
    ) {
      const width = Object.values(columnWidths)[columnIndex];
      return {
        width: width + 'px',
        minWidth: width + 'px',
        maxWidth: width + 'px',
      };
    }
    return {};
  }, [columnWidths, columnIndex]);

  const currentColumn = columns?.[columnIndex || 0];
  const columnKey = currentColumn?.key;
  const isColumnSortable = sortable && currentColumn?.sortable !== false;
  const isCurrentlySorted = sortState?.column === columnKey;

  const getSortIcon = () => {
    if (!isColumnSortable) return null;

    if (!isCurrentlySorted) {
      return <TbArrowsUpDown className="w-4 h-4 text-gray-400" />;
    }

    switch (sortState?.direction) {
      case 'asc':
        return <TbChevronUp className="w-4 h-4 text-blue-600" />;
      case 'desc':
        return <TbChevronDown className="w-4 h-4 text-blue-600" />;
      default:
        return <TbArrowsUpDown className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleClick = () => {
    if (isColumnSortable && columnKey && onSort) {
      onSort(columnKey);
    }
  };

  return (
    <th
      className={classNames(
        'py-3 px-2 text-left text-gray-700 uppercase tracking-wider text-sm font-medium',
        'overflow-hidden whitespace-nowrap text-ellipsis',
        'group-hover:whitespace-normal group-hover:overflow-visible',
        'bg-gray-200 border-r border-gray-300 last:border-r-0',
        'first:rounded-tl-md last:rounded-tr-md',
        {
          'sticky top-0 z-30 bg-gray-200': stickyHeader,
          'cursor-pointer select-none hover:bg-gray-300 transition-colors duration-150':
            isColumnSortable,
        },
        className
      )}
      style={dynamicStyle}
      title={typeof children === 'string' ? children : undefined}
      onClick={handleClick}
    >
      <div className="overflow-hidden text-ellipsis group-hover:overflow-visible flex items-center justify-between">
        <span>{children}</span>
        {isColumnSortable && (
          <span className="ml-2 shrink-0">{getSortIcon()}</span>
        )}
      </div>
    </th>
  );
};
