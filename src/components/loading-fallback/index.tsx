import { Card } from '@/components/card';
import PageTitle from '@/components/page-title';
import { Skeleton, SkeletonText } from '@/components/skeleton';

interface LoadingFallbackProps {
  title?: string;
  showSearchBar?: boolean;
  showButton?: boolean;
  tableColumns?: number;
  tableRows?: number;
  showPagination?: boolean;
}

export const TableLoadingFallback = ({
  title = 'Loading...',
  showSearchBar = true,
  showButton = true,
  tableColumns = 5,
  tableRows = 8,
  showPagination = true,
}: LoadingFallbackProps) => {
  return (
    <Card className="flex-1 flex flex-col animate-pulse">
      <div className="mb-6">
        <PageTitle title={title} />
      </div>

      {/* Search bar and button skeleton */}
      <div className="flex items-center mb-6">
        {showSearchBar && (
          <div className="grow mb-4">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        )}
        {showButton && (
          <div className="ml-4 mb-4">
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        )}
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-lg shadow-xs mb-6">
        <table className="min-w-full w-full table-fixed bg-white rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              {Array.from({ length: tableColumns }).map((_, index) => (
                <th
                  key={index}
                  className="py-3 px-3 text-left bg-slate-200 text-slate-700 uppercase tracking-wider text-sm"
                >
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {Array.from({ length: tableRows }).map((_, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors duration-150 hover:bg-slate-50 even:bg-slate-50/30"
              >
                {Array.from({ length: tableColumns }).map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="text-sm py-3 px-3 text-slate-700 align-middle"
                  >
                    <Skeleton
                      className="h-4"
                      width={`${Math.random() * 40 + 60}%`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 sm:px-6">
          <div className="flex items-center">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      )}
    </Card>
  );
};

export const DashboardLoadingFallback = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const FormLoadingFallback = () => {
  return (
    <Card className="p-6 animate-pulse">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}

        <div className="flex justify-end space-x-3 pt-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
};

// Default export for backward compatibility
export default TableLoadingFallback;
