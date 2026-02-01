import { Route } from 'react-router-dom';
import ComingSoon from '@/features/blank-page';

/**
 * ClinicRoutes
 *
 * Focused route group for clinic related pages.
 * Exported as a fragment so it can be composed inside the main <Routes> tree:
 *
 *   {ClinicRoutes}
 *
 * Keeps routing for clinic isolated to a single file (SRP).
 */
export const ClinicRoutes = (
  <>
    <Route path="clinic">
      <Route index element={<ComingSoon title="Klinik" />} />
      <Route path="patients" element={<ComingSoon title="Daftar Pasien" />} />
      <Route path="queue" element={<ComingSoon title="Antrian" />} />
      <Route
        path="medical-records"
        element={<ComingSoon title="Rekam Medis" />}
      />
    </Route>
  </>
);
