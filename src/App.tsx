import Login from "@/pages/auth/login";
import MainLayout from "@/layout/main";
import { AlertProvider } from "@/components/alert";
import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialogProvider } from "@/components/dialog-box";
import ComingSoon from "@/pages/blank-page";
import {
  TableLoadingFallback,
  DashboardLoadingFallback,
  FormLoadingFallback,
} from "@/components/loading-fallback";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const ItemList = lazy(() => import("@/pages/master-data/item-list"));
const CategoryList = lazy(() => import("@/pages/master-data/category-list"));
const UnitList = lazy(() => import("@/pages/master-data/unit-list"));
const TypeList = lazy(() => import("@/pages/master-data/type-list"));
const PatientList = lazy(() => import("@/pages/master-data/patient-list"));
const SupplierList = lazy(() => import("@/pages/master-data/supplier-list"));
const ConfirmInvoicePage = lazy(
  () => import("@/pages/purchases/confirm-invoice"),
);
const PurchaseList = lazy(() => import("@/pages/purchases/purchase-list"));
const CreatePurchase = lazy(() => import("@/pages/purchases/create-purchase"));
const Profile = lazy(() => import("@/pages/settings/profile"));
const PrintPurchase = lazy(() => import("@/pages/purchases/print-purchase"));
const ViewPurchase = lazy(() => import("@/pages/purchases/view-purchase"));

function App() {
  const { session, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <AlertProvider>
      <ConfirmDialogProvider>
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
                <div className="text-gray-800">
                  <Suspense fallback={<DashboardLoadingFallback />}>
                    <Dashboard />
                  </Suspense>
                </div>
              }
            />

            <Route path="master-data">
              <Route
                path="items"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Item"
                        tableColumns={10}
                      />
                    }
                  >
                    <ItemList />
                  </Suspense>
                }
              />
              <Route
                path="categories"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Kategori Item"
                        tableColumns={2}
                      />
                    }
                  >
                    <CategoryList />
                  </Suspense>
                }
              />
              <Route
                path="types"
                element={
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Daftar Jenis Item"
                          tableColumns={2}
                        />
                      }
                    >
                      <TypeList />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="units"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Satuan Item"
                        tableColumns={2}
                      />
                    }
                  >
                    <UnitList />
                  </Suspense>
                }
              />
              <Route
                path="suppliers"
                element={
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
                }
              />
              <Route
                path="patients"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Pasien"
                        tableColumns={6}
                      />
                    }
                  >
                    <PatientList />
                  </Suspense>
                }
              />
            </Route>

            <Route path="purchases">
              <Route
                index
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Pembelian"
                        tableColumns={7}
                      />
                    }
                  >
                    <PurchaseList />
                  </Suspense>
                }
              />
              <Route
                path="create"
                element={
                  <Suspense fallback={<FormLoadingFallback />}>
                    <CreatePurchase />
                  </Suspense>
                }
              />
              <Route
                path="confirm-invoice"
                element={
                  <Suspense fallback={<FormLoadingFallback />}>
                    <ConfirmInvoicePage />
                  </Suspense>
                }
              />
              <Route
                path="view/:id"
                element={
                  <Suspense fallback={<FormLoadingFallback />}>
                    <ViewPurchase />
                  </Suspense>
                }
              />
              <Route
                path="orders"
                element={<ComingSoon title="Daftar Pesanan Beli" />}
              />
              <Route
                path="price-history"
                element={<ComingSoon title="Riwayat Harga Beli" />}
              />
            </Route>

            <Route path="inventory">
              <Route index element={<ComingSoon title="Persediaan" />} />
              <Route path="stock" element={<ComingSoon title="Stok Obat" />} />
              <Route
                path="stock-opname"
                element={<ComingSoon title="Stok Opname" />}
              />
              <Route
                path="expired"
                element={<ComingSoon title="Obat Kadaluarsa" />}
              />
            </Route>

            <Route path="sales">
              <Route index element={<ComingSoon title="Daftar Penjualan" />} />
              <Route
                path="create"
                element={<ComingSoon title="Tambah Penjualan" />}
              />
            </Route>

            <Route path="clinic">
              <Route index element={<ComingSoon title="Klinik" />} />
              <Route
                path="patients"
                element={<ComingSoon title="Daftar Pasien" />}
              />
              <Route path="queue" element={<ComingSoon title="Antrian" />} />
              <Route
                path="medical-records"
                element={<ComingSoon title="Rekam Medis" />}
              />
            </Route>

            <Route path="reports">
              <Route index element={<ComingSoon title="Laporan" />} />
              <Route
                path="sales"
                element={<ComingSoon title="Laporan Penjualan" />}
              />
              <Route
                path="purchases"
                element={<ComingSoon title="Laporan Pembelian" />}
              />
              <Route
                path="stock"
                element={<ComingSoon title="Laporan Stok" />}
              />
            </Route>

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
              <Route
                path="app"
                element={<ComingSoon title="Pengaturan Aplikasi" />}
              />
            </Route>
          </Route>
        </Routes>
      </ConfirmDialogProvider>
    </AlertProvider>
  );
}

export default App;
