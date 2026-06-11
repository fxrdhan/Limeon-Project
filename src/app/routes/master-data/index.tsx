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
      <Route path="item-master/*" element={<></>} />
      <Route path="suppliers" element={<></>} />
      <Route path="customers" element={<></>} />
      <Route path="patients" element={<></>} />
      <Route path="doctors" element={<></>} />
    </Route>
  </>
);
