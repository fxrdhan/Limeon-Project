import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormAction from './index';

describe('FormAction', () => {
  it('renders cancel/save actions in create mode', () => {
    const onCancel = vi.fn();

    render(
      <FormAction
        onCancel={onCancel}
        isSaving={false}
        isDeleting={false}
        cancelText="Tutup"
        saveText="Simpan Baru"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Simpan Baru' })
    ).toBeInTheDocument();
  });

  it('renders delete/update actions in edit mode and respects disabled states', () => {
    const onDelete = vi.fn();

    render(
      <FormAction
        onCancel={vi.fn()}
        onDelete={onDelete}
        isSaving={false}
        isDeleting={false}
        isEditMode={true}
        isSubmitDisabled={true}
        updateText="Perbarui"
        deleteText="Hapus Data"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Data' }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('button', { name: 'Perbarui' })).toBeDisabled();
  });
});
