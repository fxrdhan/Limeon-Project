import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showPagination?: boolean;
  className?: string;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 10,
  columns = 4,
  showPagination = true,
  className = '',
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {/* Table Header */}
      <div className="bg-slate-100 border border-slate-200 rounded-t-lg p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className="flex-1">
              <div className="h-4 bg-slate-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className="border-l border-r border-slate-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="border-b border-slate-200 p-4 hover:bg-slate-50"
          >
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, colIndex) => (
                <div key={colIndex} className="flex-1">
                  <div
                    className={`h-4 bg-slate-200 rounded ${
                      colIndex === 0
                        ? 'w-1/2'
                        : colIndex === columns - 1
                          ? 'w-full'
                          : 'w-3/4'
                    }`}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-b-lg p-4">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>

      {/* Pagination Skeleton */}
      {showPagination && (
        <div className="mt-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-slate-200 rounded"></div>
            <div className="h-8 w-20 bg-slate-200 rounded"></div>
          </div>
          <div className="flex space-x-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-8 w-8 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      )}
    </div>
  );
};

export default TableSkeleton;
