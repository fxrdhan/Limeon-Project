import React, { useEffect, useMemo, useRef } from 'react';
import type { FieldConfig, Supplier as SupplierType } from '@/types';
import type { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import type { useSupplierMutations } from '@/features/item-management/public/useSupplierData';

import IdentityDataModal from '@/components/identity-data-modal';
import { identityImageStorageService } from '../../../infrastructure/identityImageStorage.service';
import {
  buildSupplierCreatePayload,
  buildSupplierModalData,
  buildSupplierUpdatePayload,
  normalizeSupplierInlineFieldValue,
} from '../supplierModalData';

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

  const supplierModalData = useMemo(
    () => buildSupplierModalData(editingSupplier),
    [editingSupplier]
  );

  return (
    <>
      <IdentityDataModal
        title="Tambah Supplier Baru"
        data={{}}
        fields={supplierFields}
        isOpen={isActive && isAddSupplierModalOpen}
        onClose={closeAddSupplierModal}
        onSave={async data => {
          const result = await supplierMutations.createSupplier.mutateAsync(
            buildSupplierCreatePayload(data)
          );
          closeAddSupplierModal();
          return result;
        }}
        mode="add"
        initialNameFromSearch={
          supplierSearch.startsWith('#') ? '' : supplierSearch
        }
        useInlineFieldActions={false}
      />

      <IdentityDataModal
        title="Edit Supplier"
        data={supplierModalData}
        fields={supplierFields}
        isOpen={isActive && isEditSupplierModalOpen}
        onClose={closeEditSupplierModal}
        onSave={async data => {
          if (!editingSupplier?.id) return;
          const result = await supplierMutations.updateSupplier.mutateAsync({
            id: editingSupplier.id,
            data: buildSupplierUpdatePayload(data),
          });
          closeEditSupplierModal();
          return result;
        }}
        onFieldSave={async (key, value) => {
          if (!editingSupplier?.id) return;

          const normalizedValue = normalizeSupplierInlineFieldValue(key, value);
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
          const { publicUrl } =
            await identityImageStorageService.uploadIdentityImage(
              file,
              nextImagePath
            );

          const oldImagePath =
            latestImageUrlRef.current &&
            identityImageStorageService.extractIdentityImagePath(
              latestImageUrlRef.current
            );
          const expectedImagePathPrefix = `suppliers/${entityId}/`;
          if (
            oldImagePath &&
            oldImagePath !== nextImagePath &&
            oldImagePath.startsWith(expectedImagePathPrefix)
          ) {
            await identityImageStorageService.deleteIdentityImage(oldImagePath);
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
            ? identityImageStorageService.extractIdentityImagePath(
                currentImageUrl
              )
            : null;
          if (oldImagePath) {
            await identityImageStorageService.deleteIdentityImage(oldImagePath);
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
