/**
 * Entity CRUD Operations Hook - Refactored using Configuration System
 *
 * This file replaces the previous implementation which contained unused helpers,
 * loose `any` usage and several TypeScript lint issues.
 *
 * Changes:
 * - Removed unused local helpers (code normalizer / pickers)
 * - Tightened types (use `unknown` and `Record<string, unknown>` instead of `any`)
 * - Use `toNormalizedMutations` to handle external mutation normalization
 * - Memoize `refetch` so it is safe to include in hook dependency arrays
 * - Keep behavior compatible with consumers: returns `handleModalSubmit` and a
 *   `deleteMutation`-compatible object.
 */

import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  getExternalHooks,
  isEntityTypeSupported,
  type EntityTypeKey,
} from '../core/GenericHookFactories';
import { ENTITY_CONFIGURATIONS } from '../core/EntityHookConfigurations';
import {
  toNormalizedMutations,
  anyPending,
  firstError,
  type NormalizedMutations,
  type NormalizedMutationHandle,
} from '../core/MutationAdapter';

/**
 * Lookup the external hooks provider for a given table using the centralized
 * entity configuration system.
 */
const getHooksForTable = (tableName: string) => {
  const found = Object.entries(ENTITY_CONFIGURATIONS).find(
    ([, cfg]) => cfg.query.tableName === tableName
  );

  const entityType = found?.[0] as EntityTypeKey | undefined;
  if (!entityType || !isEntityTypeSupported(entityType)) {
    throw new Error(`Unsupported table: ${tableName}`);
  }
  return getExternalHooks(entityType);
};

type ItemFormPayload = {
  id?: string;
  code?: string;
  name: string;
  description?: string;
  address?: string;
  nci_code?: string;
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
  type UseDataReturn = { refetch?: () => Promise<unknown> } | undefined;
  const dataHookReturn = (typeof hooks.useData === 'function'
    ? (
        hooks.useData as (
          opts?: { enabled?: boolean } | undefined
        ) => UseDataReturn
      )({ enabled: true })
    : undefined) ?? { refetch: () => Promise.resolve() };

  // Extract the refetch function (if present) and memoize it so it can be safely
  // included in useCallback dependency arrays without causing spurious changes.
  const dataRefetch = (dataHookReturn as { refetch?: unknown }).refetch;
  const refetch = useMemo(
    () =>
      typeof dataRefetch === 'function'
        ? (dataRefetch as () => Promise<unknown>)
        : () => Promise.resolve(),
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
    async (itemData: ItemFormPayload) => {
      try {
        // Build base data
        const baseData: Record<string, unknown> = { name: itemData.name };
        if (itemData.description !== undefined)
          baseData.description = itemData.description;
        if (itemData.address !== undefined) baseData.address = itemData.address;
        if (itemData.nci_code !== undefined)
          baseData.nci_code = itemData.nci_code;

        // All tables now use 'code' field
        if (itemData.code !== undefined) {
          baseData.code = itemData.code;
        }

        if (itemData.id) {
          if (normalizedUpdate) {
            const updatePayload: { id: string } & Record<string, unknown> = {
              id: itemData.id,
              ...baseData,
            };
            await normalizedUpdate.mutateAsync(updatePayload);
          }
        } else {
          if (normalizedCreate) {
            const createPayload: Record<string, unknown> = baseData;
            await normalizedCreate.mutateAsync(createPayload);
          }
        }

        // Ensure UI refresh
        await refetch();
      } catch (err: unknown) {
        // Narrow PostgrestError-like objects
        const isPostgrestError = (e: unknown): e is PostgrestError => {
          if (typeof e !== 'object' || e === null) return false;
          const rec = e as Record<string, unknown>;
          return (
            typeof rec.message === 'string' && typeof rec.code === 'string'
          );
        };

        const errorMessage = isPostgrestError(err)
          ? err.message
          : typeof err === 'string'
            ? err
            : String(err ?? 'Unknown error');

        const errorDetails = isPostgrestError(err) ? (err.details ?? '') : '';
        const errorCode = isPostgrestError(err) ? (err.code ?? '') : '';

        const isDuplicateCodeError =
          errorCode === '23505' ||
          errorMessage.includes('duplicate key value') ||
          errorMessage.includes('violates unique constraint') ||
          errorDetails.includes('already exists') ||
          errorMessage.includes('already exists') ||
          (errorMessage.includes('409') && errorMessage.includes('conflict'));

        const action = itemData.id ? 'memperbarui' : 'menambahkan';

        if (isDuplicateCodeError && itemData.code) {
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
        const isForeignKeyError =
          error instanceof Error &&
          (error.message.includes('foreign key constraint') ||
            error.message.includes('violates foreign key') ||
            error.message.includes('still referenced'));

        if (isForeignKeyError) {
          toast.error(
            `Tidak dapat menghapus ${entityNameLabel.toLowerCase()} karena masih digunakan di data lain. Hapus terlebih dahulu data yang menggunakannya.`
          );
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
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
    // Cast individual normalized handles to the generic form expected by anyPending/firstError.
    // This preserves the concrete, well-typed handles locally while satisfying the
    // invariant generic parameter expectations of the helper functions.
    isLoading: anyPending(
      normalizedCreate as unknown as NormalizedMutationHandle<unknown, unknown>,
      normalizedUpdate as unknown as NormalizedMutationHandle<unknown, unknown>,
      normalizedDelete as unknown as NormalizedMutationHandle<unknown, unknown>
    ),
    error:
      (firstError(
        normalizedCreate as unknown as NormalizedMutationHandle<
          unknown,
          unknown
        >,
        normalizedUpdate as unknown as NormalizedMutationHandle<
          unknown,
          unknown
        >,
        normalizedDelete as unknown as NormalizedMutationHandle<
          unknown,
          unknown
        >
      ) as Error | null) ?? null,
  };

  return {
    handleModalSubmit,
    deleteMutation,
  };
};
