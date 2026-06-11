import ErrorBoundary from '@/components/error-boundary';
import { TableLoadingFallback } from '@/components/loading-fallback';
import { MASTER_DATA_UNIFIED_GRID_ROUTE_PREFIXES } from '@/features/item-management/public/masterDataNavigation';
import { Suspense, lazy, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const ItemMaster = lazy(
  () => import('@/features/item-management/pages/item-master')
);

const MasterDataLayout = memo(function MasterDataLayout() {
  const location = useLocation();

  const isUnifiedGridRoute = MASTER_DATA_UNIFIED_GRID_ROUTE_PREFIXES.some(
    path => location.pathname.startsWith(path)
  );

  if (!isUnifiedGridRoute) {
    return <Outlet />;
  }

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <Suspense
        fallback={<TableLoadingFallback title="Master Data" tableColumns={2} />}
      >
        <ItemMaster />
      </Suspense>
    </ErrorBoundary>
  );
});

MasterDataLayout.displayName = 'MasterDataLayout';

export default MasterDataLayout;
