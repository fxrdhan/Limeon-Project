import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupplierModals from './SupplierModals';

const capturedModals = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const uploadFileMock = vi.hoisted(() => vi.fn());
const deleteEntityImageMock = vi.hoisted(() => vi.fn());
const extractPathFromUrlMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/IdentityDataModal', () => ({
  default: (props: Record<string, unknown>) => {
    capturedModals.push(props);
    return <div data-testid={`identity-modal-${String(props.title)}`} />;
  },
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: {
    uploadFile: (...args: unknown[]) => uploadFileMock(...args),
    deleteEntityImage: (...args: unknown[]) => deleteEntityImageMock(...args),
    extractPathFromUrl: (...args: unknown[]) => extractPathFromUrlMock(...args),
  },
}));

describe('SupplierModals', () => {
  beforeEach(() => {
    capturedModals.length = 0;
    uploadFileMock.mockReset();
    deleteEntityImageMock.mockReset();
    extractPathFromUrlMock.mockReset();
    uploadFileMock.mockResolvedValue({
      publicUrl: 'https://cdn.example.com/profiles/suppliers/sup-1/image.jpg',
      path: 'suppliers/sup-1/image.jpg',
    });
    deleteEntityImageMock.mockResolvedValue(undefined);
    extractPathFromUrlMock.mockReturnValue('suppliers/sup-1/old-image.jpg');
  });

  it('maps add and edit modal props and handles add supplier save flow', async () => {
    const mutateCreate = vi.fn().mockResolvedValue(undefined);
    const closeAdd = vi.fn();

    render(
      <SupplierModals
        isActive={true}
        supplierFields={[{ key: 'name', label: 'Nama' }]}
        supplierSearch="#draft"
        isAddSupplierModalOpen={true}
        isEditSupplierModalOpen={false}
        editingSupplier={null}
        supplierMutations={{
          createSupplier: { mutateAsync: mutateCreate },
          updateSupplier: { mutateAsync: vi.fn() },
          deleteSupplier: { mutateAsync: vi.fn() },
        }}
        openConfirmDialog={vi.fn()}
        closeAddSupplierModal={closeAdd}
        closeEditSupplierModal={vi.fn()}
      />
    );

    const addModal = capturedModals.find(
      modal => modal.title === 'Tambah Supplier Baru'
    );
    expect(addModal).toBeTruthy();
    expect(addModal).toMatchObject({
      isOpen: true,
      mode: 'add',
      initialNameFromSearch: '',
      useInlineFieldActions: false,
    });

    await (
      addModal?.onSave as (payload: Record<string, unknown>) => Promise<void>
    )?.({
      name: 'PT Supplier',
      address: 'Jakarta',
      phone: '0812',
      email: 'a@b.c',
      contact_person: 'Budi',
    });

    expect(mutateCreate).toHaveBeenCalledWith({
      name: 'PT Supplier',
      address: 'Jakarta',
      phone: '0812',
      email: 'a@b.c',
      contact_person: 'Budi',
      image_url: null,
    });
    expect(closeAdd).toHaveBeenCalled();
  });

  it('handles edit supplier save and delete request confirm flow', async () => {
    const mutateUpdate = vi.fn().mockResolvedValue(undefined);
    const mutateDelete = vi.fn().mockResolvedValue(undefined);
    const closeEdit = vi.fn();
    const openConfirmDialog = vi.fn();

    render(
      <SupplierModals
        isActive={true}
        supplierFields={[{ key: 'name', label: 'Nama' }]}
        supplierSearch="supplier abc"
        isAddSupplierModalOpen={false}
        isEditSupplierModalOpen={true}
        editingSupplier={{
          id: 'sup-1',
          name: 'Supplier Satu',
          address: null,
          phone: null,
          email: null,
          contact_person: null,
          image_url: 'https://img.test/sup-1.jpg',
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        }}
        supplierMutations={{
          createSupplier: { mutateAsync: vi.fn() },
          updateSupplier: { mutateAsync: mutateUpdate },
          deleteSupplier: { mutateAsync: mutateDelete },
        }}
        openConfirmDialog={openConfirmDialog}
        closeAddSupplierModal={vi.fn()}
        closeEditSupplierModal={closeEdit}
      />
    );

    const editModal = capturedModals.find(
      modal => modal.title === 'Edit Supplier'
    );
    expect(editModal).toBeTruthy();
    expect(editModal).toMatchObject({
      isOpen: true,
      mode: 'edit',
      imageUrl: 'https://img.test/sup-1.jpg',
      useInlineFieldActions: false,
    });

    await (
      editModal?.onSave as (payload: Record<string, unknown>) => Promise<void>
    )?.({
      name: 'Supplier Update',
      address: 'Bandung',
      phone: '',
      email: '',
      contact_person: '',
    });

    expect(mutateUpdate).toHaveBeenCalledWith({
      id: 'sup-1',
      data: {
        name: 'Supplier Update',
        address: 'Bandung',
        phone: null,
        email: null,
        contact_person: null,
      },
    });

    (editModal?.onDeleteRequest as (() => void) | undefined)?.();
    expect(openConfirmDialog).toHaveBeenCalled();

    const confirmConfig = openConfirmDialog.mock.calls[0][0] as {
      onConfirm: () => Promise<void>;
    };
    await confirmConfig.onConfirm();

    expect(mutateDelete).toHaveBeenCalledWith('sup-1');
    expect(closeEdit).toHaveBeenCalled();
  });

  it('ignores edit save when supplier id is missing', async () => {
    const mutateUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <SupplierModals
        isActive={true}
        supplierFields={[]}
        supplierSearch="abc"
        isAddSupplierModalOpen={false}
        isEditSupplierModalOpen={true}
        editingSupplier={{
          id: '',
          name: 'Supplier Tanpa ID',
          address: null,
          phone: null,
          email: null,
          contact_person: null,
          image_url: null,
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        }}
        supplierMutations={{
          createSupplier: { mutateAsync: vi.fn() },
          updateSupplier: { mutateAsync: mutateUpdate },
          deleteSupplier: { mutateAsync: vi.fn() },
        }}
        openConfirmDialog={vi.fn()}
        closeAddSupplierModal={vi.fn()}
        closeEditSupplierModal={vi.fn()}
      />
    );

    const editModal = capturedModals.find(
      modal => modal.title === 'Edit Supplier'
    );
    await (
      editModal?.onSave as (payload: Record<string, unknown>) => Promise<void>
    )?.({ name: 'No ID' });

    expect(mutateUpdate).not.toHaveBeenCalled();
  });

  it('handles supplier image upload and delete for edit modal', async () => {
    const mutateUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <SupplierModals
        isActive={true}
        supplierFields={[{ key: 'name', label: 'Nama' }]}
        supplierSearch="supplier abc"
        isAddSupplierModalOpen={false}
        isEditSupplierModalOpen={true}
        editingSupplier={{
          id: 'sup-1',
          name: 'Supplier Satu',
          address: null,
          phone: null,
          email: null,
          contact_person: null,
          image_url:
            'https://cdn.example.com/profiles/suppliers/sup-1/old-image.jpg',
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
        }}
        supplierMutations={{
          createSupplier: { mutateAsync: vi.fn() },
          updateSupplier: { mutateAsync: mutateUpdate },
          deleteSupplier: { mutateAsync: vi.fn() },
        }}
        openConfirmDialog={vi.fn()}
        closeAddSupplierModal={vi.fn()}
        closeEditSupplierModal={vi.fn()}
      />
    );

    const editModal = capturedModals.find(
      modal => modal.title === 'Edit Supplier'
    ) as Record<string, unknown>;

    const file = new File(['img'], 'new-photo.jpg', { type: 'image/jpeg' });
    const uploadedUrl = await (
      editModal.onImageSave as (params: {
        entityId?: string;
        file: File;
      }) => Promise<string | void>
    )({ entityId: 'sup-1', file });

    expect(uploadFileMock).toHaveBeenCalledWith(
      'profiles',
      file,
      'suppliers/sup-1/image.jpg'
    );
    expect(uploadedUrl).toBe(
      'https://cdn.example.com/profiles/suppliers/sup-1/image.jpg'
    );
    expect(mutateUpdate).toHaveBeenCalledWith({
      id: 'sup-1',
      data: {
        image_url: 'https://cdn.example.com/profiles/suppliers/sup-1/image.jpg',
      },
      options: { silent: true },
    });

    await (editModal.onImageDelete as (entityId: string) => Promise<void>)(
      'sup-1'
    );
    expect(deleteEntityImageMock).toHaveBeenCalledWith(
      'profiles',
      'suppliers/sup-1/old-image.jpg'
    );
    expect(mutateUpdate).toHaveBeenCalledWith({
      id: 'sup-1',
      data: { image_url: null },
      options: { silent: true },
    });
  });
});
