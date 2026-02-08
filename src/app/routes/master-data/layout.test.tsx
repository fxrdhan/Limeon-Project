import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MasterDataLayout from './layout';

const useLocationMock = vi.hoisted(() => vi.fn());
const errorBoundaryPropsMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );

  return {
    ...actual,
    useLocation: useLocationMock,
    Outlet: () => <div data-testid="route-outlet">Outlet</div>,
  };
});

vi.mock('@/components/error-boundary', () => ({
  default: ({
    showDetails,
    children,
  }: {
    showDetails: boolean;
    children: React.ReactNode;
  }) => {
    errorBoundaryPropsMock({ showDetails });
    return <div data-testid="error-boundary">{children}</div>;
  },
}));

vi.mock('@/components/loading-fallback', () => ({
  TableLoadingFallback: ({ title }: { title: string }) => (
    <div data-testid="table-loading-fallback">{title}</div>
  ),
}));

vi.mock('@/features/item-management/pages/item-master', () => ({
  default: () => <div data-testid="item-master-page">Item Master</div>,
}));

describe('MasterDataLayout route', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    useLocationMock.mockReset();
    errorBoundaryPropsMock.mockReset();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('renders outlet for non-unified master-data routes', () => {
    useLocationMock.mockReturnValue({ pathname: '/master-data/legacy-page' });

    render(<MasterDataLayout />);

    expect(screen.getByTestId('route-outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
  });

  it('renders item-master inside error boundary for unified routes', async () => {
    useLocationMock.mockReturnValue({ pathname: '/master-data/customers' });

    render(<MasterDataLayout />);

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('item-master-page')).toBeInTheDocument();
    });

    expect(errorBoundaryPropsMock).toHaveBeenCalledWith({ showDetails: false });
  });

  it('enables boundary details in development mode', async () => {
    process.env.NODE_ENV = 'development';
    useLocationMock.mockReturnValue({ pathname: '/master-data/item-master' });

    render(<MasterDataLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('item-master-page')).toBeInTheDocument();
    });

    expect(errorBoundaryPropsMock).toHaveBeenCalledWith({ showDetails: true });
  });
});
