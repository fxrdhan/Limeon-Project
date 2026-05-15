import { Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import {
  TableLoadingFallback,
  FormLoadingFallback,
} from '@/components/loading-fallback';

const SalesList = lazy(() => import('@/features/sales'));
const CreateSalePage = lazy(() => import('@/features/sales/create-sale'));

/**
 * SalesRoutes
 *
 * Focused route group for sales related pages.
 * Exported as a fragment so it can be composed inside the main <Routes> tree:
 *
 *   {SalesRoutes}
 *
 * Keeps routing for sales isolated to a single file (SRP).
 */
export const SalesRoutes = (
  <>
    <Route path="sales">
      <Route
        index
        element={
          <Suspense
            fallback={
              <TableLoadingFallback title="Daftar Penjualan" tableColumns={7} />
            }
          >
            <SalesList />
          </Suspense>
        }
      />
      <Route
        path="create"
        element={
          <Suspense fallback={<FormLoadingFallback />}>
            <CreateSalePage />
          </Suspense>
        }
      />
    </Route>
  </>
);
