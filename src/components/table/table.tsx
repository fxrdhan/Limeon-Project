import { classNames } from "@/lib/classNames";
import type { TableProps, TableCellProps, TableRowProps } from "@/types";
import { memo } from "react";

export const Table = memo(({ children, className }: TableProps) => {
  return (
    <div
      className={classNames(
        "overflow-x-auto rounded-lg shadow-xs border-2 border-gray-200",
        className,
      )}
    >
      <table className="min-w-full w-full table-fixed bg-white overflow-hidden">
        {children}
      </table>
    </div>
  );
});
Table.displayName = 'Table';

export const TableHead = ({ children, className }: TableProps) => {
  return (
    <thead
      className={classNames(
        "bg-gray-50 text-gray-700 border-b-2 border-gray-200",
        className,
      )}
    >
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className }: TableProps) => {
  return (
    <tbody
      className={classNames("divide-y divide-gray-200 bg-white", className)}
    >
      {children}
    </tbody>
  );
};

export const TableRow = memo(({ children, className, ...props }: TableRowProps) => {
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
});
TableRow.displayName = 'TableRow';

export const TableCell = memo(({
  children,
  className,
  colSpan,
  ...props
}: TableCellProps) => {
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
});
TableCell.displayName = 'TableCell';

export const TableHeader = ({ children, className }: TableProps) => {
  return (
    <th
      className={classNames(
        "py-3 px-3 text-left bg-gray-100 text-gray-700 uppercase tracking-wider text-sm",
        "overflow-hidden whitespace-nowrap text-ellipsis",
        "group-hover:whitespace-normal group-hover:text-ellipsis-none group-hover:overflow-visible",
        "transition-all duration-200 max-h-[40px] group-hover:max-h-[300px]",
        className,
      )}
    >
      {children}
    </th>
  );
};
