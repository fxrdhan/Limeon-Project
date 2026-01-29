import { Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ComingSoon from '@/pages/blank-page';
import {
  TableLoadingFallback,
  FormLoadingFallback,
} from '@/components/loading-fallback';

const PurchaseList = lazy(
  () => import('@/features/purchase-management/pages/PurchaseListPage')
);
const ConfirmInvoicePage = lazy(
  () => import('@/pages/purchases/confirm-invoice')
);
const ViewPurchase = lazy(() => import('@/pages/purchases/view-purchase'));

/**
 * Purchases route group
 *
 * Exported as a JSX fragment so it can be composed inside the main <Routes> tree:
 *   {PurchasesRoutes}
 *
 * Keeps routing for purchases isolated to a single file (SRP).
 */
export const PurchasesRoutes = (
  <>
    <Route path="purchases">
      <Route
        index
        element={
          <Suspense
            fallback={
              <TableLoadingFallback title="Daftar Pembelian" tableColumns={7} />
            }
          >
            <PurchaseList />
          </Suspense>
        }
      />

      <Route
        path="confirm-invoice"
        element={
          <Suspense fallback={<FormLoadingFallback />}>
            <ConfirmInvoicePage />
          </Suspense>
        }
      />

      <Route
        path="view/:id"
        element={
          <Suspense fallback={<FormLoadingFallback />}>
            <ViewPurchase />
          </Suspense>
        }
      />

      <Route
        path="orders"
        element={<ComingSoon title="Daftar Pesanan Beli" />}
      />
      <Route
        path="price-history"
        element={<ComingSoon title="Riwayat Harga Beli" />}
      />
    </Route>
  </>
);

export default PurchasesRoutes;
