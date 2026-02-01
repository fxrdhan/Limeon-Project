import { Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ComingSoon from '@/features/blank-page';
import { FormLoadingFallback } from '@/components/loading-fallback';

const Profile = lazy(() => import('@/features/settings/profile/ProfilePage'));

/**
 * SettingsRoutes
 *
 * Focused route group for application settings pages.
 * Exported as a fragment so it can be composed inside the main <Routes> tree:
 *
 *   {SettingsRoutes}
 *
 * Keeps routing for settings isolated to a single file (SRP).
 */
export const SettingsRoutes = (
  <>
    <Route path="settings">
      <Route
        path="profile"
        element={
          <Suspense fallback={<FormLoadingFallback />}>
            <Profile />
          </Suspense>
        }
      />
      <Route path="users" element={<ComingSoon title="Pengguna" />} />
      <Route path="app" element={<ComingSoon title="Pengaturan Aplikasi" />} />
    </Route>
  </>
);
