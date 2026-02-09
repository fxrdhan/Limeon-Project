import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertProvider } from './index';
import { AlertContext } from './hooks';

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />,
  },
}));

vi.mock('react-icons/tb', () => ({
  TbAlertCircle: () => <span data-testid="icon-error" />,
  TbAlertTriangle: () => <span data-testid="icon-warning" />,
  TbCircleCheck: () => <span data-testid="icon-success" />,
  TbInfoCircle: () => <span data-testid="icon-info" />,
  TbWifi: () => <span data-testid="icon-wifi" />,
  TbX: () => <span data-testid="icon-close" />,
}));

const AlertHarness = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => ctx.addAlert('Success message', 'success')}
      >
        add-success
      </button>
      <button
        type="button"
        onClick={() =>
          ctx.addAlert('Info short', 'info', {
            duration: 100,
          })
        }
      >
        add-info-short
      </button>
      <button
        type="button"
        onClick={() =>
          ctx.addAlert('Offline custom', 'offline', {
            persistent: true,
            id: 'network-status',
          })
        }
      >
        add-offline
      </button>
      <button type="button" onClick={() => ctx.removeAlert('network-status')}>
        remove-network
      </button>
      <div data-testid="alert-count">{ctx.alerts.length}</div>
    </div>
  );
};

describe('AlertProvider', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
  });

  it('adds alerts and supports manual close action', () => {
    render(
      <AlertProvider>
        <AlertHarness />
      </AlertProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'add-success' }));
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('alert-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByLabelText('Tutup notifikasi'));
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByTestId('alert-count')).toHaveTextContent('0');
  });

  it('auto-closes non-persistent alerts after duration timeout', () => {
    render(
      <AlertProvider>
        <AlertHarness />
      </AlertProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'add-info-short' }));
    expect(screen.getByText('Info short')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(101);
    });
    expect(screen.queryByText('Info short')).not.toBeInTheDocument();
  });

  it('keeps persistent alert and replaces network alert on online event', () => {
    render(
      <AlertProvider>
        <AlertHarness />
      </AlertProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'add-offline' }));
    expect(screen.getByText('Offline custom')).toBeInTheDocument();

    vi.advanceTimersByTime(10_000);
    expect(screen.getByText('Offline custom')).toBeInTheDocument();

    fireEvent(window, new Event('online'));
    expect(screen.queryByText('Offline custom')).not.toBeInTheDocument();
    expect(
      screen.getByText('Koneksi tersambung kembali. Anda sedang online.')
    ).toBeInTheDocument();
  });

  it('shows offline alert on initial mount when browser is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(
      <AlertProvider>
        <AlertHarness />
      </AlertProvider>
    );

    expect(
      screen.getByText('Koneksi terputus. Anda sedang offline.')
    ).toBeInTheDocument();

    fireEvent(window, new Event('offline'));
    expect(
      screen.getAllByText('Koneksi terputus. Anda sedang offline.')
    ).toHaveLength(1);
  });
});
