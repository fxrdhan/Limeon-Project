import { Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ComingSoon from '@/pages/blank-page';
import ErrorBoundary from '@/components/error-boundary';
import {
  TableLoadingFallback,
  FormLoadingFallback,
} from '@/components/loading-fallback';
import { ItemMasterRedirect } from '@/components/routing/ItemMasterRedirect';

// Lazy-loaded pages
const ItemMaster = lazy(() => import('@/pages/master-data/item-master'));
const PatientList = lazy(() => import('@/pages/master-data/patient-list'));
const DoctorList = lazy(() => import('@/pages/master-data/doctor-list'));
const SupplierList = lazy(() => import('@/pages/master-data/supplier-list'));

const Profile = lazy(() => import('@/pages/settings/profile'));

// Master Data Routes
export const MasterDataRoutes = (
  <>
    <Route path="master-data">
      <Route
        path="items"
        element={<Navigate to="/master-data/item-master/items" replace />}
      />

      {/* Redirect entry point for Item Master */}
      <Route index path="item-master" element={<ItemMasterRedirect />} />

      {/* Item Master sub-routes */}
      <Route path="item-master">
        <Route
          path="items"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="categories"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="types"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="packages"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="dosages"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="manufacturers"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="units"
          element={
            <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
              <Suspense
                fallback={
                  <TableLoadingFallback title="Item Master" tableColumns={2} />
                }
              >
                <ItemMaster />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>

      {/* Others */}
      <Route
        path="suppliers"
        element={
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Suspense
              fallback={
                <TableLoadingFallback
                  title="Daftar Supplier"
                  tableColumns={5}
                />
              }
            >
              <SupplierList />
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

// Inventory Routes
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

// Sales Routes
export const SalesRoutes = (
  <>
    <Route path="sales">
      <Route index element={<ComingSoon title="Daftar Penjualan" />} />
      <Route path="create" element={<ComingSoon title="Tambah Penjualan" />} />
    </Route>
  </>
);

// Clinic Routes
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

// Reports Routes
export const ReportsRoutes = (
  <>
    <Route path="reports">
      <Route index element={<ComingSoon title="Laporan" />} />
      <Route path="sales" element={<ComingSoon title="Laporan Penjualan" />} />
      <Route
        path="purchases"
        element={<ComingSoon title="Laporan Pembelian" />}
      />
      <Route path="stock" element={<ComingSoon title="Laporan Stok" />} />
    </Route>
  </>
);

// Settings Routes
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
