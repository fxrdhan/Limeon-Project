import { AlertProvider } from '@/components/alert';
import { ConfirmDialogProvider } from '@/components/dialog-box';
import ErrorBoundary from '@/components/error-boundary';
import { DashboardLoadingFallback } from '@/components/loading-fallback';
import ToastTester from '@/components/ToastTester';
import MainLayout from '@/layout/main';
import Login from '@/pages/auth/login';
import { ClinicRoutes } from '@/pages/routes/clinic';
import { InventoryRoutes } from '@/pages/routes/inventory';
import { MasterDataRoutes } from '@/pages/routes/MasterDataRoutes';
import { PurchasesRoutes } from '@/pages/routes/purchases';
import { ReportsRoutes } from '@/pages/routes/reports';
import { SalesRoutes } from '@/pages/routes/sales';
import { SettingsRoutes } from '@/pages/routes/settings';
import { useAuthStore } from '@/store/authStore';
import { initConsoleAPI } from '@/utils/consoleCommands';
import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes } from 'react-router-dom';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const PrintPurchase = lazy(() => import('@/pages/purchases/print-purchase'));

function App() {
  const { session, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
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
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            success: {
              style: {
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid oklch(26.2% 0.051 172.552 / 0.2)',
                color: 'white',
              },
            },
            error: {
              style: {
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid oklch(27.1% 0.105 12.094 / 0.2)',
                color: 'white',
              },
            },
          }}
        />
        <Routes>
          <Route
            path="/login"
            element={!session ? <Login /> : <Navigate to="/" />}
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
            element={session ? <MainLayout /> : <Navigate to="/login" />}
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
        <ToastTester />
      </ConfirmDialogProvider>
    </AlertProvider>
  );
}

export default App;
