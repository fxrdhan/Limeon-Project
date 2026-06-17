/**
 * Entity CRUD Operations Hook
 *
 * Bridges table-driven entity screens to the configured data and mutation hooks
 * while keeping the public return shape expected by existing consumers.
 */

import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getExternalHooks } from '../core/GenericHookFactories';
import { getEntityTypeForTableName } from '../core/EntityHookConfigurations';
import {
  toNormalizedMutations,
  anyPending,
  firstError,
  type NormalizedMutations,
  type NormalizedMutationHandle,
} from '../core/MutationAdapter';
import {
  getEntityCrudErrorMessage,
  isDuplicateEntityCodeError,
  isForeignKeyReferenceError,
  toEntityCrudError,
} from './entityCrudErrors';
import {
  buildEntityCrudMutationPayload,
  type EntityCrudFormPayload,
} from './entityCrudPayload';

/**
 * Lookup the external hooks provider for a given table using the centralized
 * entity configuration system.
 */
const getHooksForTable = (tableName: string) => {
  const entityType = getEntityTypeForTableName(tableName);
  if (!entityType) {
    throw new Error(`Unsupported table: ${tableName}`);
  }
  return getExternalHooks(entityType);
};

/**
 * Hook used by item-management to perform basic CRUD operations for an entity.
 *
 * Returns:
 * - handleModalSubmit: to create/update an entity
 * - deleteMutation: object shaped like a mutation (mutateAsync + status fields)
 */
export const useEntityCrudOperations = (
  tableName: string,
  entityNameLabel: string
) => {
  const hooks = getHooksForTable(tableName);

  // Minimal typing for the data hook return that we need here (only `refetch`)
  type UseDataReturn = { refetch?: () => Promise<unknown> };
  const dataHookReturn: UseDataReturn =
    typeof hooks.useData === 'function'
      ? ((hooks.useData as (opts?: { enabled?: boolean }) => UseDataReturn)({
          enabled: true,
        }) ?? {})
      : {};

  // Extract the refetch function (if present) and memoize it so it can be safely
  // included in useCallback dependency arrays without causing spurious changes.
  const dataRefetch = dataHookReturn.refetch;
  const refetch = useMemo(
    () =>
      typeof dataRefetch === 'function' ? dataRefetch : () => Promise.resolve(),
    // depend only on the raw refetch function identity
    [dataRefetch]
  );

  // Normalize whatever raw mutations the external provider gives us.
  const rawMutations =
    typeof hooks.useMutations === 'function' ? hooks.useMutations() : undefined;
  const normalized: NormalizedMutations = toNormalizedMutations(rawMutations);

  // Pick individual mutation handles with explicit types so callers don't need to cast.
  const normalizedCreate:
    | NormalizedMutationHandle<Record<string, unknown>, unknown>
    | undefined = normalized.create;
  const normalizedUpdate:
    | NormalizedMutationHandle<
        { id: string } & Record<string, unknown>,
        unknown
      >
    | undefined = normalized.update;
  const normalizedDelete:
    | NormalizedMutationHandle<string, unknown>
    | undefined = normalized.delete;

  const handleModalSubmit = useCallback(
    async (itemData: EntityCrudFormPayload) => {
      try {
        const mutationPayload = buildEntityCrudMutationPayload(itemData);

        if (mutationPayload.action === 'update') {
          if (normalizedUpdate) {
            await normalizedUpdate.mutateAsync(mutationPayload.payload);
          }
        } else {
          if (normalizedCreate) {
            await normalizedCreate.mutateAsync(mutationPayload.payload);
          }
        }

        // Ensure UI refresh
        await refetch();
      } catch (err: unknown) {
        const errorMessage = getEntityCrudErrorMessage(err);
        const action = itemData.id ? 'memperbarui' : 'menambahkan';

        if (isDuplicateEntityCodeError(err) && itemData.code) {
          toast.error(
            `Code "${itemData.code}" sudah digunakan oleh ${entityNameLabel.toLowerCase()} lain. Silakan gunakan code yang berbeda.`
          );
        } else {
          toast.error(`Gagal ${action} ${entityNameLabel}: ${errorMessage}`);
        }
        throw err;
      }
    },
    [normalizedCreate, normalizedUpdate, entityNameLabel, refetch]
  );

  const handleDelete = useCallback(
    async (itemId: string) => {
      try {
        if (normalizedDelete) {
          await normalizedDelete.mutateAsync(itemId);
        }
        await refetch();
      } catch (error: unknown) {
        if (isForeignKeyReferenceError(error)) {
          toast.error(
            `Tidak dapat menghapus ${entityNameLabel.toLowerCase()} karena masih digunakan di data lain. Hapus terlebih dahulu data yang menggunakannya.`
          );
        } else {
          const message = getEntityCrudErrorMessage(error);
          toast.error(`Gagal menghapus ${entityNameLabel}: ${message}`);
        }
        throw error;
      }
    },
    [normalizedDelete, entityNameLabel, refetch]
  );

  // Provide a deletion mutation-shaped object for compatibility with existing consumers
  const deleteMutation = {
    mutateAsync: handleDelete,
    isLoading: anyPending(normalizedCreate, normalizedUpdate, normalizedDelete),
    error: toEntityCrudError(
      firstError(normalizedCreate, normalizedUpdate, normalizedDelete)
    ),
  };

  return {
    handleModalSubmit,
    deleteMutation,
  };
};
