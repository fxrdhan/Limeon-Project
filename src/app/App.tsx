import { AlertProvider } from '@/components/alert';
import { ConfirmDialogProvider } from '@/components/dialog-box';
import ErrorBoundary from '@/components/error-boundary';
import { DashboardLoadingFallback } from '@/components/loading-fallback';
import { ClinicRoutes } from '@/app/routes/clinic';
import { InventoryRoutes } from '@/app/routes/inventory';
import { MasterDataRoutes } from '@/app/routes/master-data';
import { PurchasesRoutes } from '@/app/routes/purchases';
import { ReportsRoutes } from '@/app/routes/reports';
import { SalesRoutes } from '@/app/routes/sales';
import { SettingsRoutes } from '@/app/routes/settings';
import { useAuthStore } from '@/store/authStore';
import { initConsoleAPI } from '@/utils/consoleCommands';
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const AppToaster = lazy(() => import('@/app/toaster'));
const Dashboard = lazy(() => import('@/features/dashboard'));
const Login = lazy(() => import('@/features/auth/login'));
const MainLayout = lazy(() => import('@/app/layout/main'));
const PrintPurchase = lazy(() => import('@/features/purchases/print-purchase'));
const ToastTester = lazy(() => import('@/components/ToastTester'));

const MainLayoutFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-slate-600">Memuat aplikasi...</p>
    </div>
  </div>
);

function App() {
  const { session, loading, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Initialize console API (development only)
  useEffect(() => {
    initConsoleAPI();
  }, []);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <AlertProvider>
      <ConfirmDialogProvider>
        <Suspense fallback={null}>
          <AppToaster />
        </Suspense>
        <Routes>
          <Route
            path="/login"
            element={
              !session ? (
                <Suspense
                  fallback={
                    <div className="p-8 text-center">
                      Memuat halaman login...
                    </div>
                  }
                >
                  <Login />
                </Suspense>
              ) : (
                <Navigate to="/" />
              )
            }
          />

          <Route
            path="/purchases/print-view"
            element={
              <Suspense
                fallback={
                  <div className="p-8 text-center">Memuat halaman print...</div>
                }
              >
                <PrintPurchase />
              </Suspense>
            }
          />

          <Route
            path="/"
            element={
              session ? (
                <Suspense fallback={<MainLayoutFallback />}>
                  <MainLayout />
                </Suspense>
              ) : (
                <Navigate to="/login" />
              )
            }
          >
            <Route
              index
              element={
                <ErrorBoundary
                  showDetails={process.env.NODE_ENV === 'development'}
                >
                  <Suspense fallback={<DashboardLoadingFallback />}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            {MasterDataRoutes}
            {PurchasesRoutes}
            {InventoryRoutes}
            {SalesRoutes}
            {ClinicRoutes}
            {ReportsRoutes}
            {SettingsRoutes}
          </Route>
        </Routes>
        <Suspense fallback={null}>
          <ToastTester />
        </Suspense>
      </ConfirmDialogProvider>
    </AlertProvider>
  );
}

export default App;
