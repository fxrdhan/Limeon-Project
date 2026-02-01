import { Route } from 'react-router-dom';
import ComingSoon from '@/features/blank-page';

/**
 * ReportsRoutes
 *
 * Focused route group for reporting pages.
 * Exported as a fragment so it can be composed inside the main <Routes> tree:
 *
 *   {ReportsRoutes}
 *
 * Keeps routing for reports isolated to a single file (SRP).
 */
export const ReportsRoutes = (
  <>
    <Route path="reports">
      <Route index element={<ComingSoon title="Laporan" />} />
      <Route path="sales" element={<ComingSoon title="Laporan Penjualan" />} />
      <Route
        path="purchases"
        element={<ComingSoon title="Laporan Pembelian" />}
      />
      <Route path="stock" element={<ComingSoon title="Laporan Stok" />} />
    </Route>
  </>
);
