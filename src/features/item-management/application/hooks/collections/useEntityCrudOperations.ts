import { useCallback } from 'react';
import { useAlert } from '@/components/alert/hooks';

// Import regular query hooks
import {
  useCategories,
  useMedicineTypes,
  useUnits,
  useItemUnits,
} from '@/hooks/queries/useMasterData';
import { useDosages } from '@/hooks/queries/useDosages';
import { useManufacturers } from '@/hooks/queries/useManufacturers';
import { useItems } from '@/hooks/queries/useItems';

// Import mutation hooks
import {
  useCategoryMutations,
  useMedicineTypeMutations,
  useUnitMutations,
  useItemUnitMutations,
  useSuppliers,
  useSupplierMutations,
  useItemMutations,
  usePatientMutations,
  useDoctorMutations,
  usePatients,
  useDoctors,
} from '@/hooks/queries';

import { useDosageMutations } from '@/hooks/queries/useDosages';
import { useManufacturerMutations } from '@/hooks/queries/useManufacturers';

// Simplified hook selector for CRUD operations only
const getHooksForTable = (tableName: string) => {
  interface QueryOptions {
    enabled?: boolean;
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
  }

  switch (tableName) {
    case 'item_categories':
      return {
        useData: (options: QueryOptions) => useCategories(options),
        useMutations: useCategoryMutations,
      };
    case 'item_types':
      return {
        useData: (options: QueryOptions) => useMedicineTypes(options),
        useMutations: useMedicineTypeMutations,
      };
    case 'item_packages':
      return {
        useData: (options: QueryOptions) => useUnits(options),
        useMutations: useUnitMutations,
      };
    case 'item_units':
      return {
        useData: (options: QueryOptions) => useItemUnits(options),
        useMutations: useItemUnitMutations,
      };
    case 'item_dosages':
      return {
        useData: (options: QueryOptions) => useDosages(options),
        useMutations: useDosageMutations,
      };
    case 'item_manufacturers':
      return {
        useData: (options: QueryOptions) => useManufacturers(options),
        useMutations: useManufacturerMutations,
      };
    case 'suppliers':
      return {
        useData: useSuppliers,
        useMutations: useSupplierMutations,
      };
    case 'items':
      return {
        useData: (options: QueryOptions) => useItems(options),
        useMutations: useItemMutations,
      };
    case 'patients':
      return {
        useData: (options: QueryOptions) => usePatients(options),
        useMutations: usePatientMutations,
      };
    case 'doctors':
      return {
        useData: (options: QueryOptions) => useDoctors(options),
        useMutations: useDoctorMutations,
      };
    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }
};

/**
 * Simplified hook for entity CRUD operations used by item-management module.
 * Only provides the essential operations actually used by useEntityManager.
 */
export const useEntityCrudOperations = (
  tableName: string,
  entityNameLabel: string
) => {
  const alert = useAlert();

  // Get the appropriate hooks for this table
  const hooks = getHooksForTable(tableName);

  // Use the appropriate data hook for refetch capability
  const { refetch } = hooks.useData({
    enabled: true,
  });

  // Get mutations
  const mutations = hooks.useMutations();

  // Handle form submission (create/update)
  const handleModalSubmit = useCallback(
    async (itemData: {
      id?: string;
      kode?: string;
      name: string;
      description?: string;
      address?: string;
      nci_code?: string;
    }) => {
      try {
        if (itemData.id) {
          // Update existing item
          const updateMutation =
            ('updateCategory' in mutations && mutations.updateCategory) ||
            ('updateMedicineType' in mutations &&
              mutations.updateMedicineType) ||
            ('updateUnit' in mutations && mutations.updateUnit) ||
            ('updateItemUnit' in mutations && mutations.updateItemUnit) ||
            ('updateSupplier' in mutations && mutations.updateSupplier) ||
            ('updateItem' in mutations && mutations.updateItem) ||
            ('updatePatient' in mutations && mutations.updatePatient) ||
            ('updateDoctor' in mutations && mutations.updateDoctor) ||
            ('updateMutation' in mutations && mutations.updateMutation);

          if (
            updateMutation &&
            typeof updateMutation === 'object' &&
            'mutateAsync' in updateMutation
          ) {
            const updateData: Record<string, unknown> = { name: itemData.name };
            if (itemData.description !== undefined) {
              updateData.description = itemData.description;
            }
            if (itemData.address !== undefined) {
              updateData.address = itemData.address;
            }
            if (itemData.nci_code !== undefined) {
              updateData.nci_code = itemData.nci_code;
            }
            if (itemData.kode !== undefined) {
              updateData.kode = itemData.kode;
              // For item_units table, use 'code' instead of 'kode'
              if (tableName === 'item_units') {
                updateData.code = itemData.kode;
                delete updateData.kode;
              }
            }

            // Handle different parameter structures for different mutation types
            if ('updateMutation' in mutations) {
              // For generic mutations (like dosages), pass parameters directly
              await (
                updateMutation as unknown as {
                  mutateAsync: (
                    params: { id: string } & Record<string, unknown>
                  ) => Promise<unknown>;
                }
              ).mutateAsync({
                id: itemData.id!,
                ...updateData,
              });
            } else {
              // For specific mutations (categories, types, units, etc.), use nested data structure
              await (
                updateMutation as unknown as {
                  mutateAsync: (params: {
                    id: string;
                    data: Record<string, unknown>;
                  }) => Promise<unknown>;
                }
              ).mutateAsync({
                id: itemData.id!,
                data: updateData,
              });
            }
          }
        } else {
          // Create new item
          const createMutation =
            ('createCategory' in mutations && mutations.createCategory) ||
            ('createMedicineType' in mutations &&
              mutations.createMedicineType) ||
            ('createUnit' in mutations && mutations.createUnit) ||
            ('createItemUnit' in mutations && mutations.createItemUnit) ||
            ('createSupplier' in mutations && mutations.createSupplier) ||
            ('createItem' in mutations && mutations.createItem) ||
            ('createPatient' in mutations && mutations.createPatient) ||
            ('createDoctor' in mutations && mutations.createDoctor) ||
            ('createMutation' in mutations && mutations.createMutation);

          if (
            createMutation &&
            typeof createMutation === 'object' &&
            'mutateAsync' in createMutation
          ) {
            const createData: Record<string, unknown> = { name: itemData.name };
            if (itemData.description !== undefined) {
              createData.description = itemData.description;
            }
            if (itemData.address !== undefined) {
              createData.address = itemData.address;
            }
            if (itemData.nci_code !== undefined) {
              createData.nci_code = itemData.nci_code;
            }
            if (itemData.kode !== undefined) {
              createData.kode = itemData.kode;
              // For item_units table, use 'code' instead of 'kode'
              if (tableName === 'item_units') {
                createData.code = itemData.kode;
                delete createData.kode;
              }
            }

            await (
              createMutation as unknown as {
                mutateAsync: (
                  data: Record<string, unknown>
                ) => Promise<unknown>;
              }
            ).mutateAsync(createData);
          }
        }

        // Manually refetch to ensure current tab updates immediately after mutation
        refetch();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const action = itemData.id ? 'memperbarui' : 'menambahkan';
        alert.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
        throw error; // Re-throw to allow caller to handle
      }
    },
    [mutations, entityNameLabel, alert, tableName, refetch]
  );

  // Handle delete operation
  const handleDelete = useCallback(
    async (itemId: string) => {
      try {
        const deleteMutation =
          ('deleteCategory' in mutations && mutations.deleteCategory) ||
          ('deleteMedicineType' in mutations && mutations.deleteMedicineType) ||
          ('deleteUnit' in mutations && mutations.deleteUnit) ||
          ('deleteItemUnit' in mutations && mutations.deleteItemUnit) ||
          ('deleteSupplier' in mutations && mutations.deleteSupplier) ||
          ('deleteItem' in mutations && mutations.deleteItem) ||
          ('deletePatient' in mutations && mutations.deletePatient) ||
          ('deleteDoctor' in mutations && mutations.deleteDoctor) ||
          ('deleteMutation' in mutations && mutations.deleteMutation);

        if (
          deleteMutation &&
          typeof deleteMutation === 'object' &&
          'mutateAsync' in deleteMutation
        ) {
          await (
            deleteMutation as unknown as {
              mutateAsync: (id: string) => Promise<unknown>;
            }
          ).mutateAsync(itemId);
        }

        // Manually refetch to ensure current tab updates immediately after mutation
        refetch();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        alert.error(`Gagal menghapus ${entityNameLabel}: ${errorMessage}`);
        throw error; // Re-throw to allow caller to handle
      }
    },
    [mutations, entityNameLabel, alert, refetch]
  );

  // Create deletion mutation object for compatibility with existing code
  const deleteMutation = {
    mutateAsync: handleDelete,
    isLoading: Object.values(mutations).some((mutation: unknown) => {
      const m = mutation as { isLoading?: boolean; isPending?: boolean };
      return m?.isLoading || m?.isPending;
    }),
    error: (() => {
      const mutationWithError = Object.values(mutations).find(
        (mutation: unknown) => {
          const m = mutation as { error?: Error };
          return m?.error;
        }
      ) as { error?: Error } | undefined;
      return mutationWithError?.error || null;
    })(),
  };

  return {
    handleModalSubmit,
    deleteMutation,
  };
};