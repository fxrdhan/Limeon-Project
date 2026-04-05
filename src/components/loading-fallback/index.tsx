import PageTitle from '@/components/page-title';
import { Skeleton } from '@/components/skeleton';

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
    <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse">
      <div className="mb-6">
        <PageTitle title={title} />
      </div>

      {/* Search bar and button skeleton */}
      <div className="flex items-center mb-6">
        {showSearchBar && (
          <div className="grow mb-4">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        )}
        {showButton && (
          <div className="ml-4 mb-4">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        )}
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-xl shadow-xs mb-6">
        <table className="min-w-full w-full table-fixed bg-white rounded-xl overflow-hidden">
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
    </div>
  );
};

export const DashboardLoadingFallback = () => {
  return (
    <div className="animate-pulse">
      <div className="border-b border-slate-200 pb-10">
        <div className="grid gap-10 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-7">
            <div>
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="mt-4 h-10 w-72 rounded-2xl" />
              <Skeleton className="mt-4 h-4 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
            </div>

            <div className="grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div>
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="mt-4 h-12 w-64 rounded-2xl" />
                <Skeleton className="mt-4 h-5 w-52 rounded-full" />
              </div>

              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="border-l-2 border-slate-200 pl-4">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="mt-4 h-5 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 xl:col-span-5 xl:border-l xl:border-t-0 xl:pl-8">
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border-l-2 border-slate-200 pl-5">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="mt-4 h-8 w-28 rounded-2xl" />
                  <Skeleton className="mt-10 h-4 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 border-b border-slate-200 py-10 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8 xl:border-r xl:border-slate-200 xl:pr-8">
          <div>
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-7 w-48 rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-80 rounded-full" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-[24px]" />
          <div className="grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="mt-3 h-6 w-20 rounded-2xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8 xl:col-span-4 xl:pl-8">
          <div>
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-7 w-44 rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-72 rounded-full" />
          </div>

          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 border-b border-slate-200 pb-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-10 py-10 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8 xl:border-r xl:border-slate-200 xl:pr-8">
          <div>
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-7 w-44 rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-80 rounded-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full bg-slate-100/70" />
            ))}
          </div>
        </div>

        <div className="space-y-8 xl:col-span-4 xl:pl-8">
          <div>
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-7 w-44 rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-72 rounded-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full bg-rose-50/70" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FormLoadingFallback = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}

        <div className="flex justify-end space-x-3 pt-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
};

// Default export for backward compatibility
