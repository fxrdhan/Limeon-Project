import { Route, Navigate } from 'react-router-dom';
import { MASTER_DATA_TAB_PATHS } from '@/features/item-management/public/masterDataNavigation';
import MasterDataLayout from './layout';

// Master Data Routes
export const MasterDataRoutes = (
  <>
    <Route path="master-data" element={<MasterDataLayout />}>
      <Route
        path="items"
        element={<Navigate to={MASTER_DATA_TAB_PATHS.items} replace />}
      />

      {/* Unified grid shell: Item Master + Suppliers + Customers + Patients + Doctors */}
      <Route path="item-master/*" element={null} />
      <Route path="suppliers" element={null} />
      <Route path="customers" element={null} />
      <Route path="patients" element={null} />
      <Route path="doctors" element={null} />
    </Route>
  </>
);
