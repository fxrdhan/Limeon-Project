import ErrorBoundary from '@/components/error-boundary';
import { TableLoadingFallback } from '@/components/loading-fallback';
import { Suspense, lazy, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const ItemMaster = lazy(() => import('@/pages/master-data/item-master'));

const MasterDataLayout = memo(function MasterDataLayout() {
  const location = useLocation();

  const isUnifiedGridRoute =
    location.pathname.startsWith('/master-data/item-master') ||
    location.pathname.startsWith('/master-data/suppliers');

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
