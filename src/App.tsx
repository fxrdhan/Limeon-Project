import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import './index.css';
import { useAuthStore } from './store/authStore';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const ItemList = lazy(() => import('./pages/master-data/ItemList'));
const CategoryList = lazy(() => import('./pages/master-data/CategoryList'));
const UnitList = lazy(() => import('./pages/master-data/UnitList'));
const TypeList = lazy(() => import('./pages/master-data/TypeList'));
const AddItem = lazy(() => import('./pages/master-data/AddItem'));
// Tambahkan halaman lain sesuai kebutuhan

function App() {
  const { session, initialize } = useAuthStore();
  
  // Inisialisasi auth state saat aplikasi dimuat
  useEffect(() => {
    initialize();
  }, [initialize]);
  

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
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
            {/* Tambahkan route lain sesuai kebutuhan */}
          </Route>
          
          {/* Tambahkan route untuk modul lain */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;