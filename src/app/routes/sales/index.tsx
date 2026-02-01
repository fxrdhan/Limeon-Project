import { Route } from 'react-router-dom';
import ComingSoon from '@/features/blank-page';

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
      <Route index element={<ComingSoon title="Daftar Penjualan" />} />
      <Route path="create" element={<ComingSoon title="Tambah Penjualan" />} />
    </Route>
  </>
);
