import { useCallback } from 'react';
import { useConfirmDialog } from '@/components/dialog-box';
import type { PackageConversion, ItemFormData } from '../../../shared/types';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseItemUserInteractionsProps {
  formState: {
    formData: ItemFormData;
    isDirty: (conversions: PackageConversion[]) => boolean;
  };
  packageConversionHook: {
    conversions: PackageConversion[];
  };
  mutations: {
    deleteItemMutation: UseMutationResult<void, Error, string, unknown>;
  };
  cache: {
    clearCache: () => void;
  };
  onClose: () => void;
  itemId?: string;
}

/**
 * Hook for managing user interactions and confirmations
 * 
 * Handles:
 * - Delete confirmations
 * - Unsaved changes confirmations  
 * - Cancel operations
 */
export const useItemUserInteractions = ({
  formState,
  packageConversionHook,
  mutations,
  cache,
  onClose,
  itemId,
}: UseItemUserInteractionsProps) => {

  const confirmDialog = useConfirmDialog();

  const isDirtyWrapper = useCallback(() => {
    return formState.isDirty(packageConversionHook.conversions);
  }, [formState, packageConversionHook.conversions]);

  const handleDeleteItem = useCallback(() => {
    if (!itemId) return;
    confirmDialog.openConfirmDialog({
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus item "${formState.formData.name}"? Stok terkait akan terpengaruh.`,
      variant: 'danger',
      confirmText: 'Hapus',
      onConfirm: () => {
        mutations.deleteItemMutation.mutate(itemId);
        cache.clearCache();
      },
    });
  }, [itemId, confirmDialog, formState.formData.name, mutations.deleteItemMutation, cache]);

  const handleCancel = useCallback((
    setIsClosing?:
      | ((value: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isDirtyWrapper()) {
      confirmDialog.openConfirmDialog({
        title: 'Konfirmasi Keluar',
        message:
          'Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.',
        confirmText: 'Tinggalkan',
        cancelText: 'Batal',
        onConfirm: () => {
          if (setIsClosing) {
            setIsClosing(true);
          } else {
            onClose();
          }
        },
        variant: 'danger',
      });
    } else {
      if (setIsClosing) {
        setIsClosing(true);
      } else {
        onClose();
      }
    }
  }, [isDirtyWrapper, confirmDialog, onClose]);

  return {
    confirmDialog,
    handleDeleteItem,
    handleCancel,
    isDirty: isDirtyWrapper,
  };
};