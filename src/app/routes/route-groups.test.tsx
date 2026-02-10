import React from 'react';
import { MemoryRouter, Outlet, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicRoutes } from './clinic';
import { InventoryRoutes } from './inventory';
import { MasterDataRoutes } from './master-data';
import { PurchasesRoutes } from './purchases';
import { ReportsRoutes } from './reports';
import { SalesRoutes } from './sales';
import { SettingsRoutes } from './settings';

vi.mock('@/features/purchase-management/pages/PurchaseListPage', () => ({
  default: () => <div data-testid="purchase-list-page">PurchaseListPage</div>,
}));

vi.mock('@/features/purchases/confirm-invoice', () => ({
  default: () => (
    <div data-testid="confirm-invoice-page">ConfirmInvoicePage</div>
  ),
}));

vi.mock('@/features/purchases/view-purchase', () => ({
  default: () => <div data-testid="view-purchase-page">ViewPurchasePage</div>,
}));

vi.mock('@/features/settings/profile/ProfilePage', () => ({
  default: () => (
    <div data-testid="settings-profile-page">SettingsProfilePage</div>
  ),
}));

vi.mock('@/features/blank-page', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="coming-soon">{title}</div>
  ),
}));

vi.mock('@/components/loading-fallback', () => ({
  TableLoadingFallback: ({ title }: { title: string }) => (
    <div data-testid="table-loading">{title}</div>
  ),
  FormLoadingFallback: () => (
    <div data-testid="form-loading">Loading form...</div>
  ),
}));

vi.mock('./master-data/layout', () => ({
  default: () => (
    <div data-testid="master-data-layout">
      MasterDataLayout
      <Outlet />
    </div>
  ),
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('route groups', () => {
  it('renders purchases route entries', async () => {
    const renderPurchases = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{PurchasesRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderPurchases('/purchases');
    expect(await screen.findByTestId('purchase-list-page')).toBeInTheDocument();
    first.unmount();

    const second = renderPurchases('/purchases/confirm-invoice');
    expect(
      await screen.findByTestId('confirm-invoice-page')
    ).toBeInTheDocument();
    second.unmount();

    const third = renderPurchases('/purchases/view/123');
    expect(await screen.findByTestId('view-purchase-page')).toBeInTheDocument();
    third.unmount();

    const fourth = renderPurchases('/purchases/orders');
    expect(await screen.findByText('Daftar Pesanan Beli')).toBeInTheDocument();
    fourth.unmount();

    const fifth = renderPurchases('/purchases/price-history');
    expect(await screen.findByText('Riwayat Harga Beli')).toBeInTheDocument();
    fifth.unmount();
  });

  it('renders settings route entries', async () => {
    const renderSettings = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{SettingsRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderSettings('/settings/profile');
    expect(
      await screen.findByTestId('settings-profile-page')
    ).toBeInTheDocument();
    first.unmount();

    const second = renderSettings('/settings/users');
    expect(await screen.findByText('Pengguna')).toBeInTheDocument();
    second.unmount();

    const third = renderSettings('/settings/app');
    expect(await screen.findByText('Pengaturan Aplikasi')).toBeInTheDocument();
    third.unmount();
  });

  it('renders clinic route entries', async () => {
    const renderClinic = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{ClinicRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderClinic('/clinic');
    expect(await screen.findByText('Klinik')).toBeInTheDocument();
    first.unmount();

    const second = renderClinic('/clinic/patients');
    expect(await screen.findByText('Daftar Pasien')).toBeInTheDocument();
    second.unmount();

    const third = renderClinic('/clinic/queue');
    expect(await screen.findByText('Antrian')).toBeInTheDocument();
    third.unmount();

    const fourth = renderClinic('/clinic/medical-records');
    expect(await screen.findByText('Rekam Medis')).toBeInTheDocument();
    fourth.unmount();
  });

  it('renders inventory route entries', async () => {
    const renderInventory = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{InventoryRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderInventory('/inventory');
    expect(await screen.findByText('Persediaan')).toBeInTheDocument();
    first.unmount();

    const second = renderInventory('/inventory/stock');
    expect(await screen.findByText('Stok Obat')).toBeInTheDocument();
    second.unmount();

    const third = renderInventory('/inventory/stock-opname');
    expect(await screen.findByText('Stok Opname')).toBeInTheDocument();
    third.unmount();

    const fourth = renderInventory('/inventory/expired');
    expect(await screen.findByText('Obat Kadaluarsa')).toBeInTheDocument();
    fourth.unmount();
  });

  it('renders reports route entries', async () => {
    const renderReports = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{ReportsRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderReports('/reports');
    expect(await screen.findByText('Laporan')).toBeInTheDocument();
    first.unmount();

    const second = renderReports('/reports/sales');
    expect(await screen.findByText('Laporan Penjualan')).toBeInTheDocument();
    second.unmount();

    const third = renderReports('/reports/purchases');
    expect(await screen.findByText('Laporan Pembelian')).toBeInTheDocument();
    third.unmount();

    const fourth = renderReports('/reports/stock');
    expect(await screen.findByText('Laporan Stok')).toBeInTheDocument();
    fourth.unmount();
  });

  it('renders sales route entries', async () => {
    const renderSales = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{SalesRoutes}</Routes>
        </MemoryRouter>
      );

    const first = renderSales('/sales');
    expect(await screen.findByText('Daftar Penjualan')).toBeInTheDocument();
    first.unmount();

    const second = renderSales('/sales/create');
    expect(await screen.findByText('Tambah Penjualan')).toBeInTheDocument();
    second.unmount();
  });

  it('renders master data routes and handles redirect', async () => {
    const renderMasterData = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>{MasterDataRoutes}</Routes>
          <LocationDisplay />
        </MemoryRouter>
      );

    const first = renderMasterData('/master-data/suppliers');
    expect(await screen.findByTestId('master-data-layout')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/master-data/suppliers'
    );
    first.unmount();

    const second = renderMasterData('/master-data/items');
    expect(await screen.findByTestId('master-data-layout')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/master-data/item-master/items'
    );
    second.unmount();

    const third = renderMasterData('/master-data/customers');
    expect(await screen.findByTestId('master-data-layout')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/master-data/customers'
    );
    third.unmount();
  });
});
