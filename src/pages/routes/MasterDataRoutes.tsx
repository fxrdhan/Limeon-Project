import { Route, Navigate } from 'react-router-dom';
import MasterDataLayout from './MasterDataLayout';

// Master Data Routes
export const MasterDataRoutes = (
  <>
    <Route path="master-data" element={<MasterDataLayout />}>
      <Route
        path="items"
        element={<Navigate to="/master-data/item-master/items" replace />}
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
