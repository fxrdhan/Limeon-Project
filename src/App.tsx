import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import './index.css';
import { useAuthStore } from './store/authStore';
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog';
import OfflineAlert from './components/ui/OfflineAlert';

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ItemList = lazy(() => import('./pages/master-data/ItemList'));
const CategoryList = lazy(() => import('./pages/master-data/CategoryList'));
const UnitList = lazy(() => import('./pages/master-data/UnitList'));
const TypeList = lazy(() => import('./pages/master-data/TypeList'));
const AddItem = lazy(() => import('./pages/master-data/AddItem'));
const SupplierList = lazy(() => import('./pages/master-data/SupplierList'));
const UploadInvoice = lazy(() => import('./pages/purchases/UploadInvoice'));
const ConfirmInvoicePage = lazy(() => import('./pages/purchases/ConfirmInvoice'));
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList'));
const CreatePurchase = lazy(() => import('./pages/purchases/CreatePurchase'));
const Profile = lazy(() => import('./pages/settings/Profile'));
const PrintPurchase = lazy(() => import('./pages/purchases/PrintPurchase'));
const ViewPurchase = lazy(() => import('./pages/purchases/ViewPurchase'));

const ComingSoon = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-xl">Fitur ini akan segera hadir!</p>
      <div className="mt-8 p-4 border border-blue-300 rounded-lg bg-blue-50 max-w-md">
        <p className="text-blue-600 text-center">
          Halaman ini sedang dalam pengembangan.
        </p>
      </div>
    </div>
  );
};

function App() {
  const { session, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);


  return (
    <ConfirmDialogProvider>
      <OfflineAlert />
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

        <Route path="/purchases/print-view" element={
          <Suspense fallback={<div>Loading...</div>}>
            <PrintPurchase />
          </Suspense>} />

        <Route path="/" element={session ? <MainLayout /> : <Navigate to="/login" />}>
          <Route
            index
            element={
              <div className="text-gray-800">
                <Suspense fallback={<div>Loading...</div>}>
                  <Dashboard />
                </Suspense>
              </div>
            } />

          <Route path="master-data">
            <Route path="items" element={
              <Suspense fallback={<div>Loading...</div>}>
                <ItemList />
              </Suspense>
            } />
            <Route path="items/add" element={
              <Suspense fallback={<div>Loading...</div>}>
                <AddItem />
              </Suspense>
            } />
            <Route path="items/edit/:id" element={
              <Suspense fallback={<div>Loading...</div>}>
                <AddItem />
              </Suspense>
            } />
            <Route path="categories" element={
              <Suspense fallback={<div>Loading...</div>}>
                <CategoryList />
              </Suspense>
            } />
            <Route path="types" element={
              <Suspense fallback={<div>Loading...</div>}>
                <TypeList />
              </Suspense>
            } />
            <Route path="units" element={
              <Suspense fallback={<div>Loading...</div>}>
                <UnitList />
              </Suspense>
            } />
            <Route path="suppliers" element={
              <Suspense fallback={<div>Loading...</div>}>
                <SupplierList />
              </Suspense>
            } />
          </Route>

          <Route path="purchases">
            <Route
              index
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <PurchaseList />
                </Suspense>
              }
            />
            <Route
              path="create"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <CreatePurchase />
                </Suspense>
              }
            />
            <Route
              path="upload-invoice"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <UploadInvoice />
                </Suspense>
              }
            />
            <Route
              path="confirm-invoice"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ConfirmInvoicePage />
                </Suspense>
              }
            />
            <Route
              path="view/:id"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <ViewPurchase />
                </Suspense>
              }
            />
            <Route path="orders" element={<ComingSoon title="Daftar Pesanan Beli" />} />
            <Route path="price-history" element={<ComingSoon title="Riwayat Harga Beli" />} />
          </Route>

          <Route path="inventory">
            <Route
              index
              element={<ComingSoon title="Persediaan" />}
            />
            <Route
              path="stock"
              element={<ComingSoon title="Stok Obat" />}
            />
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
            <Route
              index
              element={<ComingSoon title="Daftar Penjualan" />}
            />
            <Route
              path="create"
              element={<ComingSoon title="Tambah Penjualan" />}
            />
          </Route>

          <Route path="clinic">
            <Route
              index
              element={<ComingSoon title="Klinik" />}
            />
            <Route
              path="patients"
              element={<ComingSoon title="Daftar Pasien" />}
            />
            <Route
              path="queue"
              element={<ComingSoon title="Antrian" />}
            />
            <Route
              path="medical-records"
              element={<ComingSoon title="Rekam Medis" />}
            />
          </Route>

          <Route path="reports">
            <Route index element={<ComingSoon title="Laporan" />} />
            <Route path="sales" element={<ComingSoon title="Laporan Penjualan" />} />
            <Route path="purchases" element={<ComingSoon title="Laporan Pembelian" />} />
            <Route path="stock" element={<ComingSoon title="Laporan Stok" />} />
          </Route>

          <Route path="settings">
            <Route path="profile" element={
              <Suspense fallback={<div>Loading...</div>}>
                <Profile />
              </Suspense>
            } />
            <Route path="users" element={<ComingSoon title="Pengguna" />} />
            <Route path="app" element={<ComingSoon title="Pengaturan Aplikasi" />} />
          </Route>
        </Route>
      </Routes>
    </ConfirmDialogProvider>
  );
}

export default App;