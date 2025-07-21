import Login from "@/pages/auth/login";
import MainLayout from "@/layout/main";
import { AlertProvider } from "@/components/alert";
import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialogProvider } from "@/components/dialog-box";
import ComingSoon from "@/pages/blank-page";
import ErrorBoundary from "@/components/error-boundary";
import {
  TableLoadingFallback,
  DashboardLoadingFallback,
  FormLoadingFallback,
} from "@/components/loading-fallback";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const DashboardNew = lazy(() => import("@/pages/dashboard-new"));
const ItemList = lazy(() => import("@/pages/master-data/item-list"));
const ItemListNew = lazy(() => import("@/pages/master-data/item-list-new"));
const ItemMaster = lazy(() => import("@/pages/master-data/item-master-new"));
const ItemMasterOld = lazy(() => import("@/pages/master-data/item-master"));
const PatientList = lazy(() => import("@/pages/master-data/patient-list"));
const PatientListNew = lazy(() => import("@/pages/master-data/patient-list-new"));
const DoctorList = lazy(() => import("@/pages/master-data/doctor-list"));
const DoctorListNew = lazy(() => import("@/pages/master-data/doctor-list-new"));
const SupplierList = lazy(() => import("@/pages/master-data/supplier-list"));
const SupplierListNew = lazy(() => import("@/pages/master-data/supplier-list-new"));
const ConfirmInvoicePage = lazy(
  () => import("@/pages/purchases/confirm-invoice"),
);
const PurchaseList = lazy(() => import("@/pages/purchases/purchase-list"));
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
                <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                  <Suspense fallback={<DashboardLoadingFallback />}>
                    <DashboardNew />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            
            {/* Architecture Testing Routes */}
            <Route
              path="dashboard-old"
              element={
                <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                  <Suspense fallback={<DashboardLoadingFallback />}>
                    <Dashboard />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="dashboard-new"
              element={
                <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                  <Suspense fallback={<DashboardLoadingFallback />}>
                    <DashboardNew />
                  </Suspense>
                </ErrorBoundary>
              }
            />

            <Route path="master-data">
              <Route
                path="items"
                element={
                  <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Daftar Item"
                          tableColumns={10}
                        />
                      }
                    >
                      <ItemListNew />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="items-old"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Item (Old Architecture)"
                        tableColumns={10}
                      />
                    }
                  >
                    <ItemList />
                  </Suspense>
                }
              />
              <Route
                path="item-master"
                element={
                  <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Item Master"
                          tableColumns={2}
                        />
                      }
                    >
                      <ItemMaster />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="item-master-old"
                element={
                  <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Item Master (Old Architecture)"
                          tableColumns={2}
                        />
                      }
                    >
                      <ItemMasterOld />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="categories"
                element={<Navigate to="/master-data/item-master" replace />}
              />
              <Route
                path="types"
                element={<Navigate to="/master-data/item-master" replace />}
              />
              <Route
                path="units"
                element={<Navigate to="/master-data/item-master" replace />}
              />
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
                      <SupplierListNew />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="suppliers-old"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Supplier (Old Architecture)"
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
                  <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Daftar Pasien"
                          tableColumns={6}
                        />
                      }
                    >
                      <PatientListNew />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="patients-old"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Pasien (Old Architecture)"
                        tableColumns={6}
                      />
                    }
                  >
                    <PatientList />
                  </Suspense>
                }
              />
              <Route
                path="doctors"
                element={
                  <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
                    <Suspense
                      fallback={
                        <TableLoadingFallback
                          title="Daftar Dokter"
                          tableColumns={6}
                        />
                      }
                    >
                      <DoctorListNew />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="doctors-old"
                element={
                  <Suspense
                    fallback={
                      <TableLoadingFallback
                        title="Daftar Dokter (Old Architecture)"
                        tableColumns={6}
                      />
                    }
                  >
                    <DoctorList />
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
