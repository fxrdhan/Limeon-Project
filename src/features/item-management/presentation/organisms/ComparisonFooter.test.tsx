import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComparisonFooter from './ComparisonFooter';

const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

describe('ComparisonFooter', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );
  });

  it('renders close-only footer when restore should be hidden', () => {
    render(<ComparisonFooter shouldShowRestore={false} onClose={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: /Restore v/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeInTheDocument();
  });

  it('does nothing when restore lacks selectedVersion or onRestore handler', async () => {
    const close = vi.fn();
    render(<ComparisonFooter shouldShowRestore={true} onClose={close} />);

    fireEvent.click(screen.getByRole('button', { name: /Restore v/i }));
    await waitFor(() => {
      expect(close).not.toHaveBeenCalled();
    });
  });

  it('does not restore when confirm dialog is cancelled', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    );
    const onRestore = vi.fn(async () => undefined);
    const close = vi.fn();

    render(
      <ComparisonFooter
        shouldShowRestore={true}
        selectedVersion={{ version_number: 3, entity_data: {} }}
        onRestore={onRestore}
        onClose={close}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore v3' }));

    await waitFor(() => {
      expect(onRestore).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
    });
  });

  it('restores selected version and closes modal after success', async () => {
    const onRestore = vi.fn(async () => undefined);
    const close = vi.fn();

    render(
      <ComparisonFooter
        shouldShowRestore={true}
        selectedVersion={{ version_number: 5, entity_data: {} }}
        onRestore={onRestore}
        onClose={close}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore v5' }));

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith(5);
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  it('shows toast error when restore fails', async () => {
    const onRestore = vi.fn(async () => {
      throw new Error('restore failed');
    });

    render(
      <ComparisonFooter
        shouldShowRestore={true}
        selectedVersion={{ version_number: 8, entity_data: {} }}
        onRestore={onRestore}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore v8' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Gagal mengembalikan versi')
      );
    });
  });
});
