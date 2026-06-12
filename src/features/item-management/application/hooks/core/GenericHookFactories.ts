/**
 * Generic Hook Factory System
 *
 * Provides configuration-driven query and mutation hook factories for
 * item-management entity types.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { GenericEntityService } from '@/services/api/genericEntity.service';
import {
  useCategories,
  useMedicineTypes,
  usePackages,
  useItemUnits,
  useInventoryUnits,
  useCategoryMutations,
  useMedicineTypeMutations,
  usePackageMutations,
  useItemUnitMutations,
  useInventoryUnitMutations,
} from '@/hooks/queries/useMasterData';
import { useDosages, useDosageMutations } from '@/hooks/queries/useDosages';
import {
  useManufacturers,
  useManufacturerMutations,
} from '@/hooks/queries/useManufacturers';
import {
  type EntityTypeKey,
  type EntityForType,
  type CreateInputForEntityType,
  type UpdateInputForEntityType,
  getQueryConfig,
  getMutationConfig,
} from './EntityHookConfigurations';

// Re-export commonly used types
export type { EntityTypeKey };
export { isEntityTypeSupported } from './EntityHookConfigurations';

// ============================================================================
// GENERIC QUERY HOOK FACTORY
// ============================================================================

/**
 * Options for generic entity queries
 */
export interface GenericQueryOptions {
  enabled?: boolean;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  select?: string[]; // Allow custom field selection
}

/**
 * Generic query hook factory
 *
 * Creates a type-safe useQuery hook for any entity type using the configuration system.
 * Eliminates the need for duplicate query definitions.
 */
export function createEntityQuery<TEntityType extends EntityTypeKey>(
  entityType: TEntityType
) {
  type TEntity = EntityForType<TEntityType>;

  const config = getQueryConfig(entityType);
  const service = new GenericEntityService<TEntity>(config.tableName);

  return function useGenericEntityQuery(
    options: GenericQueryOptions = {},
    queryOptions?: Partial<UseQueryOptions<TEntity[], Error>>
  ) {
    const { enabled = true, filters = {}, orderBy, select } = options;

    return useQuery<TEntity[], Error>({
      queryKey: [...config.queryKey, filters, orderBy, select],
      queryFn: async () => {
        // Apply custom field selection or use default
        const selectFields = select ? select.join(', ') : config.selectFields;

        // Apply ordering
        const orderByField = orderBy?.column || config.orderByField;
        const ascending = orderBy?.ascending ?? true;
        const { data, error } = await service.list({
          select: selectFields,
          filters,
          orderBy: { column: orderByField, ascending },
        });

        if (error) {
          console.error(`Error fetching ${config.entityDisplayName}:`, error);
          throw error;
        }

        return data || [];
      },
      enabled,
      ...queryOptions,
    });
  };
}

/**
 * Create all entity query hooks using the factory
 */
export const useEntityQueries = {
  categories: createEntityQuery('categories'),
  types: createEntityQuery('types'),
  packages: createEntityQuery('packages'),
  inventoryUnits: createEntityQuery('inventoryUnits'),
  units: createEntityQuery('units'),
  dosages: createEntityQuery('dosages'),
  manufacturers: createEntityQuery('manufacturers'),
} as const;

// ============================================================================
// GENERIC MUTATION HOOK FACTORY
// ============================================================================

/**
 * Generic create mutation options
 */
export interface CreateMutationOptions<TEntity = unknown> {
  onSuccess?: (data: TEntity) => void;
  onError?: (error: Error) => void;
  invalidateQueries?: boolean;
}

/**
 * Generic update mutation options
 */
export interface UpdateMutationOptions<TEntity = unknown> {
  onSuccess?: (data: TEntity) => void;
  onError?: (error: Error) => void;
  invalidateQueries?: boolean;
}

/**
 * Generic delete mutation options
 */
export interface DeleteMutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  invalidateQueries?: boolean;
}

/**
 * Generic mutation hook factory for CRUD operations
 *
 * Creates type-safe mutation hooks for any entity type using the configuration system.
 * Eliminates the need for duplicate mutation definitions.
 */
export function createEntityMutations<TEntityType extends EntityTypeKey>(
  entityType: TEntityType
) {
  type TEntity = EntityForType<TEntityType>;
  type TCreateInput = CreateInputForEntityType<TEntityType>;
  type TUpdateInput = UpdateInputForEntityType<TEntityType>;

  const config = getMutationConfig(entityType);
  const service = new GenericEntityService<TEntity>(config.tableName);

  // Note: queryClient is obtained inside individual hooks, not at factory level

  /**
   * Create mutation hook
   */
  const useCreateMutation = (options: CreateMutationOptions<TEntity> = {}) => {
    const { onSuccess, onError, invalidateQueries = true } = options;
    const queryClient = useQueryClient(); // Get queryClient inside hook

    return useMutation({
      mutationFn: async (input: TCreateInput) => {
        const { data, error } = await service.create(
          input as Record<string, unknown>,
          config.selectFields
        );

        if (error) {
          console.error(`Error creating ${config.entityDisplayName}:`, error);
          throw error;
        }

        return data!;
      },
      onSuccess: data => {
        if (invalidateQueries) {
          void queryClient.invalidateQueries({ queryKey: config.queryKey });
        }
        onSuccess?.(data);
      },
      onError: (error: Error) => {
        console.error(`Failed to create ${config.entityDisplayName}:`, error);
        onError?.(error);
      },
    });
  };

  /**
   * Update mutation hook
   */
  const useUpdateMutation = (options: UpdateMutationOptions<TEntity> = {}) => {
    const { onSuccess, onError, invalidateQueries = true } = options;
    const queryClient = useQueryClient(); // Get queryClient inside hook

    return useMutation({
      mutationFn: async (input: TUpdateInput) => {
        const { id, ...updateData } = input as { id: string } & Record<
          string,
          unknown
        >;

        const { data, error } = await service.update(
          id,
          updateData,
          config.selectFields
        );

        if (error) {
          console.error(`Error updating ${config.entityDisplayName}:`, error);
          throw error;
        }

        return data!;
      },
      onSuccess: data => {
        if (invalidateQueries) {
          void queryClient.invalidateQueries({ queryKey: config.queryKey });
        }
        onSuccess?.(data);
      },
      onError: (error: Error) => {
        console.error(`Failed to update ${config.entityDisplayName}:`, error);
        onError?.(error);
      },
    });
  };

  /**
   * Delete mutation hook
   */
  const useDeleteMutation = (options: DeleteMutationOptions = {}) => {
    const { onSuccess, onError, invalidateQueries = true } = options;
    const queryClient = useQueryClient(); // Get queryClient inside hook

    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await service.delete(id);

        if (error) {
          console.error(`Error deleting ${config.entityDisplayName}:`, error);
          throw error;
        }
      },
      onSuccess: () => {
        if (invalidateQueries) {
          void queryClient.invalidateQueries({ queryKey: config.queryKey });
        }
        onSuccess?.();
      },
      onError: (error: Error) => {
        console.error(`Failed to delete ${config.entityDisplayName}:`, error);
        onError?.(error);
      },
    });
  };

  return {
    useCreate: useCreateMutation,
    useUpdate: useUpdateMutation,
    useDelete: useDeleteMutation,
  };
}

/**
 * Create all entity mutation hooks using the factory
 */
export const useEntityMutations = {
  categories: createEntityMutations('categories'),
  types: createEntityMutations('types'),
  packages: createEntityMutations('packages'),
  inventoryUnits: createEntityMutations('inventoryUnits'),
  units: createEntityMutations('units'),
  dosages: createEntityMutations('dosages'),
  manufacturers: createEntityMutations('manufacturers'),
} as const;

// ============================================================================
// EXTERNAL HOOK INTEGRATION SYSTEM
// ============================================================================

/**
 * External hook integration for existing hooks outside this module
 *
 * This provides a clean interface to external hooks while maintaining
 * the configuration-driven approach.
 */

/**
 * External hook registry
 *
 * Maps entity types to their corresponding external hooks.
 * Maps entity types to their corresponding external hooks.
 */
export const EXTERNAL_HOOK_REGISTRY = {
  categories: {
    useData: useCategories,
    useMutations: useCategoryMutations,
  },
  types: {
    useData: useMedicineTypes,
    useMutations: useMedicineTypeMutations,
  },
  packages: {
    useData: usePackages,
    useMutations: usePackageMutations,
  },
  inventoryUnits: {
    useData: useInventoryUnits,
    useMutations: useInventoryUnitMutations,
  },
  units: {
    useData: useItemUnits,
    useMutations: useItemUnitMutations,
  },
  dosages: {
    useData: useDosages,
    useMutations: useDosageMutations,
  },
  manufacturers: {
    useData: useManufacturers,
    useMutations: useManufacturerMutations,
  },
} as const;

/**
 * Type-safe external hook getter
 *
 * Replaces switch statements with configuration lookup.
 */
export function getExternalHooks<T extends EntityTypeKey>(entityType: T) {
  const hooks = EXTERNAL_HOOK_REGISTRY[entityType];
  if (!hooks) {
    throw new Error(
      `No external hooks configured for entity type: ${entityType}`
    );
  }
  return hooks;
}
