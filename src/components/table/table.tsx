import { classNames } from "@/lib/classNames";
import type { TableCellProps, TableRowProps, TableProps } from "@/types";
import { memo } from "react";
import React from "react";
import { useTableHeight } from "@/hooks/useTableHeight";

export const Table = memo(
  ({
    children,
    className,
    scrollable = false,
    maxHeight,
    stickyHeader = false,
  }: TableProps) => {
    const dynamicHeight = useTableHeight(320);
    const tableHeight = scrollable ? (maxHeight || dynamicHeight) : undefined;
    
    if (scrollable) {
      return (
        <div
          className={classNames(
            "overflow-auto rounded-lg border-2 border-gray-200",
            className,
          )}
          style={{ maxHeight: tableHeight }}
        >
          <table className="min-w-full w-full table-fixed bg-white">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child) && child.type === TableHead) {
                return React.cloneElement(
                  child as React.ReactElement<{ stickyHeader?: boolean }>,
                  { stickyHeader },
                );
              }
              return child;
            })}
          </table>
        </div>
      );
    }

    return (
      <div
        className={classNames(
          "overflow-x-auto rounded-lg shadow-xs border-2 border-gray-200",
          className,
        )}
      >
        <table className="min-w-full w-full table-fixed bg-white overflow-hidden">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === TableHead) {
              return React.cloneElement(
                child as React.ReactElement<{ stickyHeader?: boolean }>,
                { stickyHeader },
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
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
}) => {
  return (
    <thead
      className={classNames(
        "bg-gray-50 text-gray-700 border-b-2 border-gray-200",
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
                (headerChild) => {
                  if (
                    React.isValidElement(headerChild) &&
                    headerChild.type === TableHeader
                  ) {
                    return React.cloneElement(
                      headerChild as React.ReactElement<{
                        stickyHeader?: boolean;
                      }>,
                      { stickyHeader },
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
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <tbody
      className={classNames("divide-y divide-gray-200 bg-white", className)}
    >
      {children}
    </tbody>
  );
};

export const TableRow = memo(
  ({ children, className, ...props }: TableRowProps) => {
    return (
      <tr
        className={classNames(
          "transition-colors duration-150 hover:bg-gray-50 even:bg-gray-50/30 group",
          className,
        )}
        {...props}
      >
        {children}
      </tr>
    );
  },
);
TableRow.displayName = "TableRow";

export const TableCell = memo(
  ({ children, className, colSpan, ...props }: TableCellProps) => {
    return (
      <td
        colSpan={colSpan}
        className={classNames(
          "text-sm py-3 px-3 text-gray-700 align-middle overflow-hidden whitespace-nowrap text-ellipsis",
          "group-hover:whitespace-normal group-hover:text-ellipsis-none group-hover:overflow-visible",
          "transition-all duration-200 max-h-[40px] group-hover:max-h-[300px]",
          className,
        )}
        {...props}
      >
        {children}
      </td>
    );
  },
);
TableCell.displayName = "TableCell";

export const TableHeader = ({
  children,
  className,
  stickyHeader,
}: {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
}) => {
  return (
    <th
      className={classNames(
        "py-3 px-3 text-left bg-gray-100 text-gray-700 uppercase tracking-wider text-sm",
        "overflow-hidden whitespace-nowrap text-ellipsis",
        "group-hover:whitespace-normal group-hover:text-ellipsis-none group-hover:overflow-visible",
        "transition-all duration-200 max-h-[40px] group-hover:max-h-[300px]",
        stickyHeader && "bg-gray-100",
        className,
      )}
    >
      {children}
    </th>
  );
};
