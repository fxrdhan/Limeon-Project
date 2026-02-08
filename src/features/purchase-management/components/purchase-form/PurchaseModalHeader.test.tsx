import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseModalHeader from './PurchaseModalHeader';

describe('PurchaseModalHeader', () => {
  it('closes modal when not already closing', () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <PurchaseModalHeader
        title="Tambah Pembelian"
        onClose={onClose}
        isClosing={false}
        setIsClosing={setIsClosing}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));

    expect(setIsClosing).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger close flow when modal is already closing', () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <PurchaseModalHeader
        title="Tambah Pembelian"
        onClose={onClose}
        isClosing={true}
        setIsClosing={setIsClosing}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));

    expect(setIsClosing).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
