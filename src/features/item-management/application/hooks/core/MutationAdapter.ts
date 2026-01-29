/**
 * Normalized Mutation Adapter
 *
 * Purpose:
 * - Provide a unified interface for create/update/delete mutations coming from various external hooks
 * - Normalize parameter shapes (e.g., update { id, data } vs { id, ...fields })
 *
 * Why:
 * - External hooks (legacy or third-party) expose different method names and payload shapes
 * - This adapter reduces branching and special cases in consumers (e.g. useEntityCrudOperations)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface NormalizedMutationHandle<TArg = unknown, TResult = unknown> {
  mutateAsync: (arg: TArg) => Promise<TResult>;
  isPending?: boolean;
  isLoading?: boolean;
  error?: unknown;
}

export interface NormalizedMutations {
  /**
   * Create mutation expects a flat record of fields
   */
  create?: NormalizedMutationHandle<Record<string, unknown>, unknown>;

  /**
   * Update mutation expects { id, ...fields } (flat)
   * The adapter will convert to { id, data } for providers that require nested payloads.
   */
  update?: NormalizedMutationHandle<
    { id: string } & Record<string, unknown>,
    unknown
  >;

  /**
   * Delete mutation expects a simple string id
   */
  delete?: NormalizedMutationHandle<string, unknown>;
}

// Internal shape describing an external mutation object we can work with
type MutationLike = {
  mutateAsync: (...args: unknown[]) => Promise<unknown>;
  isPending?: boolean;
  isLoading?: boolean;
  error?: unknown;
};

// ============================================================================
// CONSTANTS (KNOWN LEGACY/GLOBAL KEYS)
// ============================================================================

const CREATE_KEYS = [
  'createMutation',
  'createCategory',
  'createMedicineType',
  'createPackage',
  'createItemUnit',
  'createSupplier',
  'createItem',
  'createPatient',
  'createDoctor',
] as const;

const UPDATE_KEYS = [
  'updateMutation', // generic, expects flat payload { id, ...fields }
  'updateCategory',
  'updateMedicineType',
  'updatePackage',
  'updateItemUnit',
  'updateSupplier',
  'updateItem',
  'updatePatient',
  'updateDoctor',
] as const;

const DELETE_KEYS = [
  'deleteMutation',
  'deleteCategory',
  'deleteMedicineType',
  'deletePackage',
  'deleteItemUnit',
  'deleteSupplier',
  'deleteItem',
  'deletePatient',
  'deleteDoctor',
] as const;

// ============================================================================
// INTERNAL UTILS
// ============================================================================

function pickFirstExistingKey<K extends string>(
  obj: Record<string, unknown>,
  keys: readonly K[]
): { key: K; value: MutationLike } | null {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        const maybe = value as Record<string, unknown>;
        const mutate = maybe['mutateAsync'];
        if (typeof mutate === 'function') {
          return { key, value: maybe as MutationLike };
        }
      }
    }
  }
  return null;
}

function extractCommonState(from: unknown): {
  isPending?: boolean;
  isLoading?: boolean;
  error?: unknown;
} {
  if (!from || typeof from !== 'object') return {};
  const f = from as Record<string, unknown>;
  const isPending =
    (f['isPending'] as boolean | undefined) ??
    (f['isLoading'] as boolean | undefined);
  const isLoading =
    (f['isLoading'] as boolean | undefined) ??
    (f['isPending'] as boolean | undefined);
  const error = f['error'];
  return { isPending, isLoading, error };
}

// ============================================================================
// ADAPTER FACTORY
// ============================================================================

/**
 * Build normalized mutations from raw mutations object.
 *
 * @param rawMutations The raw external mutations object (from legacy/external hooks)
 */
export function toNormalizedMutations(
  rawMutations: unknown
): NormalizedMutations {
  const mutationsObj = (rawMutations ?? {}) as Record<string, unknown>;

  // Resolve underlying raw methods by known keys
  const createRaw = pickFirstExistingKey(mutationsObj, CREATE_KEYS);
  const updateRaw = pickFirstExistingKey(mutationsObj, UPDATE_KEYS);
  const deleteRaw = pickFirstExistingKey(mutationsObj, DELETE_KEYS);

  const normalized: NormalizedMutations = {};

  if (createRaw?.value) {
    const common = extractCommonState(createRaw.value);
    normalized.create = {
      async mutateAsync(data: Record<string, unknown>) {
        // Most providers for create expect a flat record
        return await createRaw.value.mutateAsync(data);
      },
      ...common,
    };
  }

  if (updateRaw?.value) {
    const common = extractCommonState(updateRaw.value);
    const updateKey = updateRaw.key; // used to decide payload shape

    normalized.update = {
      async mutateAsync(
        input: { id: string } & Record<string, unknown>
      ): Promise<unknown> {
        const { id, ...fields } = input ?? ({} as { id: string });

        // Some providers (generic "updateMutation") want a flat payload { id, ...fields }
        // Others (legacy) want a nested payload { id, data: {...} }
        const wantsFlat =
          updateKey === 'updateMutation' ||
          // Heuristic: if provider exposes a createMutation key, it's likely using flat payload style for update too.
          Object.prototype.hasOwnProperty.call(mutationsObj, 'createMutation');

        if (wantsFlat) {
          return await updateRaw.value.mutateAsync({
            id,
            ...fields,
          });
        } else {
          return await updateRaw.value.mutateAsync({
            id,
            data: fields,
          });
        }
      },
      ...common,
    };
  }

  if (deleteRaw?.value) {
    const common = extractCommonState(deleteRaw.value);
    normalized.delete = {
      async mutateAsync(id: string): Promise<unknown> {
        return await deleteRaw.value.mutateAsync(id);
      },
      ...common,
    };
  }

  return normalized;
}

// ============================================================================
// QUALITY-OF-LIFE HELPERS
// ============================================================================

/**
 * Small helper to detect if normalized mutations are fully available.
 */
export function hasFullCRUD(m: NormalizedMutations): boolean {
  return Boolean(m.create && m.update && m.delete);
}

/**
 * Helper to merge multiple mutation states to a single "pending" boolean.
 */
export function anyPending(
  ...handles: Array<NormalizedMutationHandle<unknown, unknown> | undefined>
): boolean {
  return handles.some(h => (h?.isPending ?? h?.isLoading) === true);
}

/**
 * Helper to collect the first error from multiple handles.
 */
export function firstError(
  ...handles: Array<NormalizedMutationHandle<unknown, unknown> | undefined>
): unknown | null {
  for (const h of handles) {
    if (h?.error) return h.error;
  }
  return null;
}
