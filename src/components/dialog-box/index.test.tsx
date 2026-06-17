import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ConfirmDialogProvider } from '.';
import { useConfirmDialog } from './useConfirmDialog';

const DialogLauncher = ({
  onCancel = vi.fn(),
  onConfirm,
}: {
  onCancel?: () => void;
  onConfirm: () => void;
}) => {
  const { openConfirmDialog } = useConfirmDialog();

  return (
    <button
      type="button"
      onClick={() =>
        openConfirmDialog({
          cancelText: 'Batal',
          confirmText: 'Hapus',
          message: 'Yakin hapus data ini?',
          onCancel,
          onConfirm,
          title: 'Hapus Data',
          variant: 'danger',
        })
      }
    >
      Buka Dialog
    </button>
  );
};

const renderDialog = (props: {
  onCancel?: () => void;
  onConfirm: () => void;
}) =>
  render(
    <ConfirmDialogProvider>
      <DialogLauncher {...props} />
    </ConfirmDialogProvider>
  );

describe('ConfirmDialogProvider', () => {
  it('ignores duplicate confirm clicks before the dialog close render commits', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Buka Dialog' }));
    const confirmButton = screen.getByRole('button', { name: 'Hapus' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not confirm after cancel already handled the dialog action', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    renderDialog({ onCancel, onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Buka Dialog' }));
    const cancelButton = screen.getByRole('button', { name: 'Batal' });
    const confirmButton = screen.getByRole('button', { name: 'Hapus' });
    fireEvent.click(cancelButton);
    fireEvent.click(confirmButton);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('resets the handled action guard when a new dialog opens', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: 'Buka Dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka Dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
