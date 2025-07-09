import { classNames } from "@/lib/classNames";
import type { TableCellProps, TableRowProps, TableProps } from "@/types";
import { memo, useMemo, useRef, useState, useEffect } from "react";
import React from "react";
import { useTableHeight } from "@/hooks/useTableHeight";

type ColumnConfig = {
  key: string;
  header: string;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableData = any;

type DynamicTableProps = TableProps & {
  columns?: ColumnConfig[];
  data?: TableData[];
  autoSize?: boolean;
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
  }: DynamicTableProps) => {
    const dynamicHeight = useTableHeight(320);
    const tableHeight = scrollable ? maxHeight || dynamicHeight : undefined;
    const { width: containerWidth, containerRef } = useContainerWidth();

    const columnWidths = useMemo(() => {
      if (autoSize && columns && data && data.length > 0) {
        return calculateColumnWidths(columns, data, containerWidth);
      }
      return {};
    }, [columns, data, autoSize, containerWidth]);

    if (scrollable) {
      return (
        <div
          ref={containerRef}
          className={classNames(
            "w-full rounded-lg border-2 border-gray-200 overflow-hidden",
            className,
          )}
          style={{ 
            maxHeight: tableHeight,
            height: tableHeight 
          }}
        >
          <div className="overflow-auto h-full">
            <table className="w-full table-fixed bg-white min-w-full">
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child) && child.type === TableHead) {
                  return React.cloneElement(
                    child as React.ReactElement<{
                      stickyHeader?: boolean;
                      columnWidths?: Record<string, number>;
                    }>,
                    { stickyHeader, columnWidths },
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
                }>,
                { stickyHeader, columnWidths },
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
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  columnWidths?: Record<string, number>;
}) => {
  return (
    <thead
      className={classNames(
        "text-gray-700 border-b-2 border-gray-200 group",
        stickyHeader && "sticky top-0 z-10",
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
                      }>,
                      { stickyHeader, columnWidths, columnIndex: index },
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
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  columnWidths?: Record<string, number>;
  columnIndex?: number;
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

  return (
    <th
      className={classNames(
        "py-3 px-2 text-left text-gray-700 uppercase tracking-wider text-sm font-medium",
        "overflow-hidden whitespace-nowrap text-ellipsis",
        "group-hover:whitespace-normal group-hover:overflow-visible",
        "bg-gray-200 border-r border-gray-300 last:border-r-0",
        "first:rounded-tl-md last:rounded-tr-md",
        stickyHeader && "sticky top-0 z-10",
        className,
      )}
      style={dynamicStyle}
      title={typeof children === "string" ? children : undefined}
    >
      <div className="overflow-hidden text-ellipsis group-hover:overflow-visible">
        {children}
      </div>
    </th>
  );
};
