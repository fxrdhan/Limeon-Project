import { classNames } from "@/lib/classNames";
import type { TableCellProps, TableRowProps, TableProps } from "@/types";
import { memo, useMemo, useRef, useState, useEffect } from "react";
import React from "react";
import { useTableHeight } from "@/hooks/useTableHeight";
import { ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon } from "@heroicons/react/24/outline";

type SortDirection = "asc" | "desc" | "original";

type ColumnConfig = {
  key: string;
  header: string;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
};

type SortState = {
  column: string | null;
  direction: SortDirection;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableData = any;

type DynamicTableProps = TableProps & {
  columns?: ColumnConfig[];
  data?: TableData[];
  autoSize?: boolean;
  sortable?: boolean;
  onSort?: (data: TableData[]) => void;
};

// Hook untuk mendapatkan ukuran container secara real-time
const useContainerWidth = () => {
  const [width, setWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        setWidth(containerWidth > 0 ? containerWidth : window.innerWidth - 40);
      } else {
        setWidth(window.innerWidth - 40);
      }
    };

    // Update width on mount
    updateWidth();

    // Update width on resize
    window.addEventListener("resize", updateWidth);

    // Observer untuk memantau perubahan ukuran container
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  return { width, containerRef };
};

const calculateColumnWidths = (
  columns: ColumnConfig[],
  data: TableData[],
  containerWidth: number,
) => {
  const widths: Record<string, number> = {};
  const ratios: Record<string, number> = {};

  let totalRatio = 0;

  // Hitung rasio ideal untuk setiap kolom berdasarkan rata-rata + percentile
  columns.forEach((column) => {
    const headerLength = column.header.length;

    // Kumpulkan semua panjang konten dalam kolom ini
    const contentLengths: number[] = [];

    data.forEach((row) => {
      const cellContent = row[column.key];
      let contentLength = 0;

      if (cellContent !== null && cellContent !== undefined) {
        if (typeof cellContent === "number") {
          contentLength = cellContent.toLocaleString("id-ID").length;
        } else if (
          typeof cellContent === "object" &&
          cellContent !== null &&
          "name" in cellContent
        ) {
          contentLength = String((cellContent as { name: string }).name).length;
        } else if (Array.isArray(cellContent)) {
          contentLength = cellContent
            .map((item) =>
              typeof item === "object" && item !== null && "name" in item
                ? (item as { name: string }).name
                : String(item),
            )
            .join(", ").length;
        } else {
          contentLength = String(cellContent).length;
        }
      }

      contentLengths.push(contentLength);
    });

    // Hitung statistik
    const sortedLengths = contentLengths.sort((a, b) => a - b);
    const avgLength =
      contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length;

    // Gunakan percentile 75% agar tidak terlalu dipengaruhi outlier
    const p75Index = Math.floor(sortedLengths.length * 0.75);
    const p75Length = sortedLengths[p75Index] || 0;

    // Gunakan yang lebih kecil antara rata-rata*1.2 atau p75, tapi min 6 karakter
    const smartContentLength = Math.max(
      Math.min(avgLength * 1.2, p75Length),
      6,
    );

    // Bandingkan dengan header length
    const idealLength = Math.max(headerLength, smartContentLength);
    const ratio = Math.max(idealLength, 6); // Minimum ratio 6 karakter

    ratios[column.key] = ratio;
    totalRatio += ratio;
  });

  // Available width dikurangi padding dan margin
  const availableWidth = Math.max(containerWidth - 60, 300); // Minimum 300px

  // Hitung lebar proporsional
  let totalCalculatedWidth = 0;
  const tempWidths: Record<string, number> = {};

  columns.forEach((column) => {
    const proportionalWidth =
      (ratios[column.key] / totalRatio) * availableWidth;

    let finalWidth = proportionalWidth;

    // Apply min/max constraints
    if (column.minWidth) finalWidth = Math.max(finalWidth, column.minWidth);
    if (column.maxWidth) finalWidth = Math.min(finalWidth, column.maxWidth);

    tempWidths[column.key] = finalWidth;
    totalCalculatedWidth += finalWidth;
  });

  // Jika total width melebihi available width, scale down secara proporsional
  if (totalCalculatedWidth > availableWidth) {
    const scaleFactor = availableWidth / totalCalculatedWidth;
    columns.forEach((column) => {
      let scaledWidth = tempWidths[column.key] * scaleFactor;

      // Pastikan tidak kurang dari minimum absolut (40px)
      scaledWidth = Math.max(scaledWidth, 40);

      // Re-apply minWidth constraint jika masih memungkinkan
      if (column.minWidth && scaledWidth < column.minWidth) {
        const minWidthTotal = columns.reduce((sum, col) => {
          return sum + (col.minWidth || 40);
        }, 0);

        // Jika total minWidth masih bisa difit, gunakan minWidth
        if (minWidthTotal <= availableWidth) {
          scaledWidth = column.minWidth;
        }
      }

      widths[column.key] = Math.floor(scaledWidth);
    });
  } else {
    // Jika masih ada sisa space, distribusikan secara merata
    const remainingSpace = availableWidth - totalCalculatedWidth;
    const spacePerColumn = remainingSpace / columns.length;

    columns.forEach((column) => {
      widths[column.key] = Math.floor(tempWidths[column.key] + spacePerColumn);
    });
  }

  return widths;
};

const sortData = (
  data: TableData[],
  column: string,
  direction: SortDirection,
  originalData: TableData[]
): TableData[] => {
  if (direction === "original") {
    return [...originalData];
  }

  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];

    if (aVal === null || aVal === undefined) aVal = "";
    if (bVal === null || bVal === undefined) bVal = "";

    if (typeof aVal === "object" && aVal !== null && "name" in aVal) {
      aVal = (aVal as { name: string }).name;
    }
    if (typeof bVal === "object" && bVal !== null && "name" in bVal) {
      bVal = (bVal as { name: string }).name;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (direction === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
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
    onSort,
  }: DynamicTableProps) => {
    const dynamicHeight = useTableHeight(320);
    const tableMaxHeight = scrollable ? maxHeight || dynamicHeight : undefined;
    const { width: containerWidth, containerRef } = useContainerWidth();
    const originalDataRef = useRef<TableData[]>([]);
    const [sortState, setSortState] = useState<SortState>({
      column: null,
      direction: "original"
    });
    const [sortedData, setSortedData] = useState<TableData[]>(data || []);

    // Update original data ref when data changes
    useEffect(() => {
      if (data && data.length > 0) {
        originalDataRef.current = [...data];
      }
    }, [data]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (data) {
        if (sortState.column && sortState.direction !== "original") {
          const sorted = sortData(data, sortState.column, sortState.direction, originalDataRef.current);
          setSortedData(sorted);
          onSort?.(sorted);
        } else {
          setSortedData([...data]);
          onSort?.(data);
        }
      }
    }, [data, sortState]);

    const handleSort = (columnKey: string) => {
      if (!sortable) return;
      
      const column = columns?.find(col => col.key === columnKey);
      if (column?.sortable === false) return;
      
      setSortState(prev => {
        if (prev.column !== columnKey) {
          return { column: columnKey, direction: "asc" };
        }
        
        const nextDirection = prev.direction === "asc" ? "desc" : 
                             prev.direction === "desc" ? "original" : "asc";
        return { column: columnKey, direction: nextDirection };
      });
    };

    const columnWidths = useMemo(() => {
      if (autoSize && columns && sortedData && sortedData.length > 0) {
        return calculateColumnWidths(columns, sortedData, containerWidth);
      }
      return {};
    }, [columns, sortedData, autoSize, containerWidth]);

    if (scrollable) {
      return (
        <div
          ref={containerRef}
          className={classNames(
            "w-full rounded-lg border-2 border-gray-200 overflow-hidden",
            className,
          )}
          style={{
            maxHeight: tableMaxHeight,
            // Removed fixed height - let content determine natural height
          }}
        >
          <div className="overflow-auto" style={{ maxHeight: tableMaxHeight }}>
            <table className="w-full table-fixed bg-white min-w-full">
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === TableHead) {
                  return React.cloneElement(
                    child as React.ReactElement<{
                      stickyHeader?: boolean;
                      columnWidths?: Record<string, number>;
                      sortable?: boolean;
                      sortState?: SortState;
                      onSort?: (columnKey: string) => void;
                      columns?: ColumnConfig[];
                    }>,
                    { stickyHeader, columnWidths, sortable, sortState, onSort: handleSort, columns },
                  );
                }
                if (React.isValidElement(child) && child.type === TableBody) {
                  return React.cloneElement(
                    child as React.ReactElement<{
                      columnWidths?: Record<string, number>;
                      columns?: ColumnConfig[];
                    }>,
                    { columnWidths, columns },
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
          "w-full overflow-hidden rounded-lg shadow-xs border-2 border-gray-200",
          className,
        )}
      >
        <table className="w-full table-fixed bg-white min-w-full">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === TableHead) {
              return React.cloneElement(
                child as React.ReactElement<{
                  stickyHeader?: boolean;
                  columnWidths?: Record<string, number>;
                  sortable?: boolean;
                  sortState?: SortState;
                  onSort?: (columnKey: string) => void;
                  columns?: ColumnConfig[];
                }>,
                { stickyHeader, columnWidths, sortable, sortState, onSort: handleSort, columns },
              );
            }
            if (React.isValidElement(child) && child.type === TableBody) {
              return React.cloneElement(
                child as React.ReactElement<{
                  columnWidths?: Record<string, number>;
                  columns?: ColumnConfig[];
                }>,
                { columnWidths, columns },
              );
            }
            return child;
          })}
        </table>
      </div>
    );
  },
);
Table.displayName = "Table";

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
        "text-gray-700 border-b-2 border-gray-200 group",
        stickyHeader && "sticky top-0 z-20 bg-gray-200",
        className,
      )}
    >
      {React.Children.map(children, (child) => {
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
                      { stickyHeader, columnWidths, columnIndex: index, sortable, sortState, onSort, columns },
                    );
                  }
                  return headerChild;
                },
              ),
            },
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
      className={classNames("divide-y divide-gray-200 bg-white", className)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TableRow) {
          return React.cloneElement(
            child as React.ReactElement<{
              columnWidths?: Record<string, number>;
              columns?: ColumnConfig[];
            }>,
            { columnWidths, columns },
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
          "transition-colors duration-150 hover:bg-gray-50 even:bg-gray-50/30 group",
          className,
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
              { columnWidths, columnIndex: index, columns },
            );
          }
          return child;
        })}
      </tr>
    );
  },
);
TableRow.displayName = "TableRow";

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
          width: width + "px",
          minWidth: width + "px",
          maxWidth: width + "px",
        };
      }
      return {};
    }, [columnWidths, columnIndex]);

    const alignmentClass = useMemo(() => {
      if (columns && columnIndex !== undefined && columns[columnIndex]) {
        const align = columns[columnIndex].align;
        switch (align) {
          case "center":
            return "text-center";
          case "right":
            return "text-right";
          case "left":
          default:
            return "text-left";
        }
      }
      return "";
    }, [columns, columnIndex]);

    return (
      <td
        colSpan={colSpan}
        className={classNames(
          "text-sm py-3 px-2 text-gray-700 align-middle relative",
          "overflow-hidden whitespace-nowrap text-ellipsis",
          "group-hover:whitespace-normal group-hover:text-ellipsis-none group-hover:overflow-visible",
          "max-h-[50px] group-hover:max-h-[400px]",
          alignmentClass,
          className,
        )}
        style={dynamicStyle}
        title={typeof children === "string" ? children : undefined}
        {...props}
      >
        <div className="overflow-hidden text-ellipsis group-hover:overflow-visible">
          {children}
        </div>
      </td>
    );
  },
);
TableCell.displayName = "TableCell";

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
        width: width + "px",
        minWidth: width + "px",
        maxWidth: width + "px",
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
      return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    
    switch (sortState?.direction) {
      case "asc":
        return <ChevronUpIcon className="w-4 h-4 text-blue-600" />;
      case "desc":
        return <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
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
        "py-3 px-2 text-left text-gray-700 uppercase tracking-wider text-sm font-medium",
        "overflow-hidden whitespace-nowrap text-ellipsis",
        "group-hover:whitespace-normal group-hover:overflow-visible",
        "bg-gray-200 border-r border-gray-300 last:border-r-0",
        "first:rounded-tl-md last:rounded-tr-md",
        stickyHeader && "sticky top-0 z-30 bg-gray-200",
        isColumnSortable && "cursor-pointer select-none hover:bg-gray-300 transition-colors duration-150",
        className,
      )}
      style={dynamicStyle}
      title={typeof children === "string" ? children : undefined}
      onClick={handleClick}
    >
      <div className="overflow-hidden text-ellipsis group-hover:overflow-visible flex items-center justify-between">
        <span>{children}</span>
        {isColumnSortable && (
          <span className="ml-2 flex-shrink-0">
            {getSortIcon()}
          </span>
        )}
      </div>
    </th>
  );
};
