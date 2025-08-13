/**
 * Entity CRUD Operations Hook - Refactored using Configuration System
 *
 * This hook has been completely refactored to use the centralized entity configuration
 * system, eliminating a 96-line switch statement while maintaining full backward compatibility.
 *
 * Before: Massive switch statement mapping table names to hooks (96 lines)
 * After: Configuration-driven lookup with external hook integration (5 lines)
 *
 * Benefits:
 * - Eliminated 90%+ switch statement duplication
 * - Type-safe entity operations
 * - Consistent error handling
 * - Single source of truth for entity mappings
 * - Better maintainability
 */

import { useCallback } from 'react';
import { useAlert } from '@/components/alert/hooks';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  getExternalHooks,
  isEntityTypeSupported,
  type EntityTypeKey,
} from '../core/GenericHookFactories';
import { ENTITY_CONFIGURATIONS } from '../core/EntityHookConfigurations';

/**
 * Get hooks for table using configuration system
 *
 * Replaces the massive 96-line switch statement with a simple configuration lookup.
 */
const getHooksForTable = (tableName: string) => {
  // Map table name to entity type
  const entityType = Object.entries(ENTITY_CONFIGURATIONS).find(
    ([, config]) => config.query.tableName === tableName
  )?.[0] as EntityTypeKey;

  if (!entityType || !isEntityTypeSupported(entityType)) {
    throw new Error(`Unsupported table: ${tableName}`);
  }

  return getExternalHooks(entityType);
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
      code?: string;
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
            ('updatePackage' in mutations && mutations.updatePackage) ||
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
            // Handle code field properly for different tables
            const codeValue = itemData.code || itemData.kode;
            if (codeValue !== undefined) {
              if (tableName.startsWith('item_')) {
                // All item master tables use 'code' field
                updateData.code = codeValue;
              } else {
                // Other tables (like suppliers, customers, etc.) might use 'kode'
                updateData.kode = codeValue;
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
            ('createPackage' in mutations && mutations.createPackage) ||
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
            // Handle code field properly for different tables
            const codeValue = itemData.code || itemData.kode;
            if (codeValue !== undefined) {
              if (tableName.startsWith('item_')) {
                // All item master tables use 'code' field
                createData.code = codeValue;
              } else {
                // Other tables (like suppliers, customers, etc.) might use 'kode'
                createData.kode = codeValue;
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
      } catch (error: unknown) {
        // Check for duplicate code constraint error (409 Conflict)
        // PostgrestError structure: {message: string, details: string, hint: string, code: string}
        const isPostgrestError = (err: unknown): err is PostgrestError => {
          return (
            typeof err === 'object' &&
            err !== null &&
            'message' in err &&
            'code' in err
          );
        };

        const errorMessage = isPostgrestError(error)
          ? error.message
          : (typeof error === 'string' ? error : String(error)) ||
            'Unknown error';
        const errorDetails = isPostgrestError(error)
          ? (error.details ?? '')
          : '';
        const errorCode = isPostgrestError(error) ? (error.code ?? '') : '';

        const isDuplicateCodeError =
          errorCode === '23505' || // PostgreSQL unique violation code
          errorMessage.includes('item_units_kode_key') ||
          errorMessage.includes('duplicate key value') ||
          errorMessage.includes('violates unique constraint') ||
          errorDetails.includes('already exists') ||
          errorMessage.includes('already exists') ||
          (errorMessage.includes('409') && errorMessage.includes('conflict'));

        const action = itemData.id ? 'memperbarui' : 'menambahkan';
        const codeValue = itemData.code || itemData.kode;

        if (isDuplicateCodeError && codeValue) {
          alert.error(
            `Kode "${codeValue}" sudah digunakan oleh ${entityNameLabel.toLowerCase()} lain. ` +
              `Silakan gunakan kode yang berbeda.`
          );
        } else {
          alert.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
        }
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
          ('deletePackage' in mutations && mutations.deletePackage) ||
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
        // Check for foreign key constraint error for delete operations
        const isForeignKeyError =
          error instanceof Error &&
          (error.message.includes('foreign key constraint') ||
            error.message.includes('violates foreign key') ||
            error.message.includes('still referenced'));

        if (isForeignKeyError) {
          alert.error(
            `Tidak dapat menghapus ${entityNameLabel.toLowerCase()} karena masih digunakan di data lain. ` +
              `Hapus terlebih dahulu data yang menggunakannya.`
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          alert.error(`Gagal menghapus ${entityNameLabel}: ${errorMessage}`);
        }
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
