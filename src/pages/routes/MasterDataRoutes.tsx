import { Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ErrorBoundary from '@/components/error-boundary';
import { TableLoadingFallback } from '@/components/loading-fallback';
import MasterDataLayout from './MasterDataLayout';

// Lazy-loaded pages
const PatientList = lazy(() => import('@/pages/master-data/patient-list'));
const DoctorList = lazy(() => import('@/pages/master-data/doctor-list'));
const CustomerList = lazy(() => import('@/pages/master-data/customer-list'));

// Master Data Routes
export const MasterDataRoutes = (
  <>
    <Route path="master-data" element={<MasterDataLayout />}>
      <Route
        path="items"
        element={<Navigate to="/master-data/item-master/items" replace />}
      />

      {/* Unified grid shell: Item Master (7 tabs) + Suppliers */}
      <Route path="item-master/*" element={<></>} />
      <Route path="suppliers" element={<></>} />
      <Route
        path="customers"
        element={
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Suspense
              fallback={
                <TableLoadingFallback
                  title="Daftar Pelanggan"
                  tableColumns={6}
                />
              }
            >
              <CustomerList />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="patients"
        element={
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Suspense
              fallback={
                <TableLoadingFallback title="Daftar Pasien" tableColumns={6} />
              }
            >
              <PatientList />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="doctors"
        element={
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Suspense
              fallback={
                <TableLoadingFallback title="Daftar Dokter" tableColumns={6} />
              }
            >
              <DoctorList />
            </Suspense>
          </ErrorBoundary>
        }
      />
    </Route>
  </>
);
