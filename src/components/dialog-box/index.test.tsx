import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialogProvider, useConfirmDialog } from './index';

vi.mock('@headlessui/react', () => ({
  Transition: ({
    show,
    children,
  }: {
    show: boolean;
    children: React.ReactNode;
  }) => (show ? <>{children}</> : null),
  TransitionChild: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/button', () => ({
  default: React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<'button'>
  >(({ children, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  )),
}));

const Harness = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel?: () => void;
}) => {
  const { openConfirmDialog } = useConfirmDialog();
  return (
    <button
      type="button"
      onClick={() =>
        openConfirmDialog({
          title: 'Konfirmasi',
          message: 'Lanjutkan?',
          confirmText: 'Lanjut',
          cancelText: 'Batal',
          variant: 'danger',
          onConfirm,
          onCancel,
        })
      }
    >
      open
    </button>
  );
};

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('opens and handles confirm action', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmDialogProvider>
        <Harness onConfirm={onConfirm} />
      </ConfirmDialogProvider>
    );

    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText('Konfirmasi')).toBeInTheDocument();
    expect(screen.getByText('Lanjutkan?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Lanjut'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Konfirmasi')).not.toBeInTheDocument();
  });

  it('handles cancel and backdrop click flows', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialogProvider>
        <Harness onConfirm={onConfirm} onCancel={onCancel} />
      </ConfirmDialogProvider>
    );

    fireEvent.click(screen.getByText('open'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('Konfirmasi')).not.toBeInTheDocument();
  });

  it('focuses cancel button and traps tab focus in dialog', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    const offsetParentDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetParent'
    );
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return this instanceof HTMLButtonElement ? document.body : null;
      },
    });

    render(
      <ConfirmDialogProvider>
        <Harness onConfirm={onConfirm} />
      </ConfirmDialogProvider>
    );

    fireEvent.click(screen.getByText('open'));
    actAdvanceTimers(60);

    const cancelButton = screen.getByText('Batal');
    const confirmButton = screen.getByText('Lanjut');
    const dialog = screen.getByRole('dialog');

    expect(document.activeElement).toBe(cancelButton);

    (confirmButton as HTMLButtonElement).focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(cancelButton);

    (cancelButton as HTMLButtonElement).focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmButton);

    if (offsetParentDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetParent',
        offsetParentDescriptor
      );
    }
  });
});

const actAdvanceTimers = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};
