import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary, { QueryErrorBoundary, withErrorBoundary } from './index';

vi.mock('@/components/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('react-icons/tb', () => ({
  TbAlertTriangle: (props: React.ComponentPropsWithoutRef<'svg'>) => (
    <svg data-testid="alert-icon" {...props} />
  ),
  TbRefresh: (props: React.ComponentPropsWithoutRef<'svg'>) => (
    <svg data-testid="refresh-icon" {...props} />
  ),
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Healthy Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Healthy Content')).toBeInTheDocument();
  });

  it('renders custom fallback for thrown errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowAlways = () => {
      throw new Error('custom fallback error');
    };

    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowAlways />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows default error UI, emits onError, and retries safely', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    const ThrowAlways = () => {
      throw new Error('boom always');
    };

    render(
      <ErrorBoundary onError={onError} showDetails={true}>
        <ThrowAlways />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Terjadi Kesalahan')).toBeInTheDocument();
    expect(
      screen.getByText('Detail Error (untuk Developer)')
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(screen.getByText('Oops! Terjadi Kesalahan')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('wraps components with HOC and keeps descriptive displayName', () => {
    const Wrapped = withErrorBoundary(({ label }: { label: string }) => (
      <div>{label}</div>
    ));

    render(<Wrapped label="Wrapped OK" />);
    expect(Wrapped.displayName).toContain('withErrorBoundary');
    expect(screen.getByText('Wrapped OK')).toBeInTheDocument();
  });

  it('provides query-specific fallback with default and custom messages', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ThrowAlways = () => {
      throw new Error('query boom');
    };

    const { rerender } = render(
      <QueryErrorBoundary>
        <ThrowAlways />
      </QueryErrorBoundary>
    );

    expect(
      screen.getByText('Gagal memuat data. Silakan coba lagi.')
    ).toBeInTheDocument();

    rerender(
      <QueryErrorBoundary fallbackMessage="Custom query error">
        <ThrowAlways />
      </QueryErrorBoundary>
    );
    expect(screen.getByText('Custom query error')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
