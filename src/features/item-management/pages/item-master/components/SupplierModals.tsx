import React, { useEffect, useRef } from 'react';
import type { FieldConfig, Supplier as SupplierType } from '@/types';
import type { useConfirmDialog } from '@/components/dialog-box';
import type { useSupplierMutations } from '@/hooks/queries';

import IdentityDataModal from '@/components/IdentityDataModal';
import { StorageService } from '@/services/api/storage.service';

const SUPPLIER_IMAGE_BUCKET = 'profiles';

interface SupplierModalsProps {
  isActive: boolean;
  supplierFields: FieldConfig[];
  supplierSearch: string;
  isAddSupplierModalOpen: boolean;
  isEditSupplierModalOpen: boolean;
  editingSupplier: SupplierType | null;
  supplierMutations: ReturnType<typeof useSupplierMutations>;
  openConfirmDialog: ReturnType<typeof useConfirmDialog>['openConfirmDialog'];
  closeAddSupplierModal: () => void;
  closeEditSupplierModal: () => void;
}

const SupplierModals: React.FC<SupplierModalsProps> = ({
  isActive,
  supplierFields,
  supplierSearch,
  isAddSupplierModalOpen,
  isEditSupplierModalOpen,
  editingSupplier,
  supplierMutations,
  openConfirmDialog,
  closeAddSupplierModal,
  closeEditSupplierModal,
}) => {
  const latestImageUrlRef = useRef<string | null>(
    editingSupplier?.image_url ?? null
  );

  useEffect(() => {
    latestImageUrlRef.current = editingSupplier?.image_url ?? null;
  }, [editingSupplier?.id, editingSupplier?.image_url]);

  const normalizeSupplierFieldValue = (key: string, value: unknown) => {
    if (key === 'name') {
      const normalizedName = String(value ?? '').trim();
      return normalizedName === '' ? null : normalizedName;
    }

    if (
      key === 'address' ||
      key === 'phone' ||
      key === 'email' ||
      key === 'contact_person'
    ) {
      const normalizedValue = String(value ?? '').trim();
      return normalizedValue === '' ? null : normalizedValue;
    }

    return value;
  };

  return (
    <>
      <IdentityDataModal
        title="Tambah Supplier Baru"
        data={{}}
        fields={supplierFields}
        isOpen={isActive && isAddSupplierModalOpen}
        onClose={closeAddSupplierModal}
        onSave={async data => {
          await supplierMutations.createSupplier.mutateAsync({
            name: String(data.name || ''),
            address: String(data.address || '') || null,
            phone: String(data.phone || '') || null,
            email: String(data.email || '') || null,
            contact_person: String(data.contact_person || '') || null,
            image_url: String(data.image_url || '') || null,
          });
          closeAddSupplierModal();
        }}
        mode="add"
        initialNameFromSearch={
          supplierSearch.startsWith('#') ? '' : supplierSearch
        }
        useInlineFieldActions={false}
      />

      <IdentityDataModal
        title="Edit Supplier"
        data={
          (editingSupplier as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={supplierFields}
        isOpen={isActive && isEditSupplierModalOpen}
        onClose={closeEditSupplierModal}
        onSave={async data => {
          if (!editingSupplier?.id) return;
          await supplierMutations.updateSupplier.mutateAsync({
            id: editingSupplier.id,
            data: {
              name: String(data.name || ''),
              address: String(data.address || '') || null,
              phone: String(data.phone || '') || null,
              email: String(data.email || '') || null,
              contact_person: String(data.contact_person || '') || null,
            },
          });
          closeEditSupplierModal();
        }}
        onFieldSave={async (key, value) => {
          if (!editingSupplier?.id) return;

          const normalizedValue = normalizeSupplierFieldValue(key, value);
          if (key === 'name' && normalizedValue === null) {
            return;
          }

          await supplierMutations.updateSupplier.mutateAsync({
            id: editingSupplier.id,
            data: {
              [key]: normalizedValue,
            },
            options: { silent: true },
          });
        }}
        onDeleteRequest={
          editingSupplier
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus supplier "${editingSupplier.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await supplierMutations.deleteSupplier.mutateAsync(
                      editingSupplier.id
                    );
                    closeEditSupplierModal();
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={editingSupplier?.image_url || undefined}
        onImageSave={async ({ entityId, file }) => {
          if (!entityId) return;

          const extension =
            file.name.split('.').pop()?.toLowerCase().trim() || 'jpg';
          const nextImagePath = `suppliers/${entityId}/image.${extension}`;
          const { publicUrl } = await StorageService.uploadFile(
            SUPPLIER_IMAGE_BUCKET,
            file,
            nextImagePath
          );

          const oldImagePath =
            latestImageUrlRef.current &&
            StorageService.extractPathFromUrl(
              latestImageUrlRef.current,
              SUPPLIER_IMAGE_BUCKET
            );
          if (oldImagePath && oldImagePath !== nextImagePath) {
            await StorageService.deleteEntityImage(
              SUPPLIER_IMAGE_BUCKET,
              oldImagePath
            );
          }

          await supplierMutations.updateSupplier.mutateAsync({
            id: entityId,
            data: { image_url: publicUrl },
            options: { silent: true },
          });

          latestImageUrlRef.current = publicUrl;
          return publicUrl;
        }}
        onImageDelete={async entityId => {
          if (!entityId) return;

          const currentImageUrl = latestImageUrlRef.current;
          const oldImagePath = currentImageUrl
            ? StorageService.extractPathFromUrl(
                currentImageUrl,
                SUPPLIER_IMAGE_BUCKET
              )
            : null;
          if (oldImagePath) {
            await StorageService.deleteEntityImage(
              SUPPLIER_IMAGE_BUCKET,
              oldImagePath
            );
          }

          await supplierMutations.updateSupplier.mutateAsync({
            id: entityId,
            data: { image_url: null },
            options: { silent: true },
          });

          latestImageUrlRef.current = null;
        }}
        useInlineFieldActions={false}
      />
    </>
  );
};

export default SupplierModals;
