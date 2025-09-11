import { Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import ErrorBoundary from '@/components/error-boundary';
import { TableLoadingFallback } from '@/components/loading-fallback';
import { ItemMasterRedirect } from '@/components/routing/ItemMasterRedirect';

// Lazy-loaded pages
const ItemMaster = lazy(() => import('@/pages/master-data/item-master'));
const PatientList = lazy(() => import('@/pages/master-data/patient-list'));
const DoctorList = lazy(() => import('@/pages/master-data/doctor-list'));
const SupplierList = lazy(() => import('@/pages/master-data/supplier-list'));

// Master Data Routes — only the 7 item-master tabs + 3 other tabs
export const MasterDataRoutes = (
  <>
    <Route path="master-data">
      <Route
        path="items"
        element={<Navigate to="/master-data/item-master/items" replace />}
      />

      {/* Redirect entry point for Item Master */}
      <Route index path="item-master" element={<ItemMasterRedirect />} />

      {/* Item Master sub-routes (7 tabs) */}
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

      {/* Other Master Data tabs (3 tabs) */}
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
