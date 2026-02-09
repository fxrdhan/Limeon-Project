import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet } from 'react-router-dom';
import App from './App';

const useAuthStoreMock = vi.hoisted(() => vi.fn());
const initConsoleAPIMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/utils/consoleCommands', () => ({
  initConsoleAPI: initConsoleAPIMock,
}));

vi.mock('@/components/alert', () => ({
  AlertProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-provider">{children}</div>
  ),
}));

vi.mock('@/components/dialog-box', () => ({
  ConfirmDialogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="confirm-provider">{children}</div>
  ),
}));

vi.mock('@/components/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

vi.mock('@/components/loading-fallback', () => ({
  DashboardLoadingFallback: () => <div>Dashboard fallback</div>,
}));

vi.mock('@/components/ToastTester', () => ({
  default: () => <div data-testid="toast-tester" />,
}));

vi.mock('@/app/layout/main', () => ({
  default: () => (
    <div data-testid="main-layout">
      MainLayout
      <Outlet />
    </div>
  ),
}));

vi.mock('@/features/auth/login', () => ({
  default: () => <div data-testid="login-page">LoginPage</div>,
}));

vi.mock('@/app/routes/clinic', () => ({
  ClinicRoutes: <></>,
}));
vi.mock('@/app/routes/inventory', () => ({
  InventoryRoutes: <></>,
}));
vi.mock('@/app/routes/master-data', () => ({
  MasterDataRoutes: <></>,
}));
vi.mock('@/app/routes/purchases', () => ({
  PurchasesRoutes: <></>,
}));
vi.mock('@/app/routes/reports', () => ({
  ReportsRoutes: <></>,
}));
vi.mock('@/app/routes/sales', () => ({
  SalesRoutes: <></>,
}));
vi.mock('@/app/routes/settings', () => ({
  SettingsRoutes: <></>,
}));

vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

vi.mock('@/features/dashboard', () => ({
  default: () => <div data-testid="dashboard-page">DashboardPage</div>,
}));

vi.mock('@/features/purchases/print-purchase', () => ({
  default: () => <div data-testid="print-page">PrintPage</div>,
}));

const renderApp = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );

describe('App', () => {
  beforeEach(() => {
    useAuthStoreMock.mockReset();
    initConsoleAPIMock.mockReset();
  });

  it('renders loading state while auth initialization is in progress', () => {
    const initialize = vi.fn();
    useAuthStoreMock.mockReturnValue({
      session: null,
      loading: true,
      initialize,
    });

    renderApp('/');

    expect(screen.getByText('Memuat...')).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initConsoleAPIMock).toHaveBeenCalledTimes(1);
  });

  it('renders login route for unauthenticated session', async () => {
    useAuthStoreMock.mockReturnValue({
      session: null,
      loading: false,
      initialize: vi.fn(),
    });

    renderApp('/login');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
    expect(screen.getByTestId('toast-tester')).toBeInTheDocument();
  });

  it('redirects authenticated user away from /login and renders main layout', async () => {
    useAuthStoreMock.mockReturnValue({
      session: { user: { id: 'user-1' } },
      loading: false,
      initialize: vi.fn(),
    });

    renderApp('/login');

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('renders print purchase route with suspense boundary', async () => {
    useAuthStoreMock.mockReturnValue({
      session: null,
      loading: false,
      initialize: vi.fn(),
    });

    renderApp('/purchases/print-view');

    await waitFor(() => {
      expect(screen.getByTestId('print-page')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated root route to login', async () => {
    useAuthStoreMock.mockReturnValue({
      session: null,
      loading: false,
      initialize: vi.fn(),
    });

    renderApp('/');

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
