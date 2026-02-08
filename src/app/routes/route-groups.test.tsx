import React from 'react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PurchasesRoutes } from './purchases';
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
});
