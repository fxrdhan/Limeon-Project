import { Route } from 'react-router-dom';
import ComingSoon from '@/features/blank-page';

/**
 * InventoryRoutes
 *
 * Focused route group for inventory related pages.
 * Exported as a fragment so it can be composed inside the main <Routes> tree:
 *
 *   {InventoryRoutes}
 *
 * Keeps routing for inventory isolated to a single file (SRP).
 */
export const InventoryRoutes = (
  <>
    <Route path="inventory">
      <Route index element={<ComingSoon title="Persediaan" />} />
      <Route path="stock" element={<ComingSoon title="Stok Obat" />} />
      <Route path="stock-opname" element={<ComingSoon title="Stok Opname" />} />
      <Route path="expired" element={<ComingSoon title="Obat Kadaluarsa" />} />
    </Route>
  </>
);
