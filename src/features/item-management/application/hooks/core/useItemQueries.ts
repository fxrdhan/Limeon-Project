/**
 * Item query composition for item-management master data.
 */

import { useEntityQueries } from './GenericHookFactories';

/**
 * Unified item queries hook using the generic factory system
 *
 * Keeps the existing query result shape used by item-management consumers.
 */
export const useItemQueries = () => {
  // Use factory-generated hooks with default configuration
  const categoriesQuery = useEntityQueries.categories();
  const typesQuery = useEntityQueries.types();
  const packagesQuery = useEntityQueries.packages();
  const inventoryUnitsQuery = useEntityQueries.inventoryUnits();
  const unitsQuery = useEntityQueries.units();
  const dosagesQuery = useEntityQueries.dosages();
  const manufacturersQuery = useEntityQueries.manufacturers();

  return {
    categoriesData: categoriesQuery.data,
    typesData: typesQuery.data,
    packagesData: packagesQuery.data,
    inventoryUnitsData: inventoryUnitsQuery.data,
    unitsData: unitsQuery.data,
    dosagesData: dosagesQuery.data,
    manufacturersData: manufacturersQuery.data,

    // Enhanced: Also expose full query objects for advanced usage
    queries: {
      categories: categoriesQuery,
      types: typesQuery,
      packages: packagesQuery,
      inventoryUnits: inventoryUnitsQuery,
      units: unitsQuery,
      dosages: dosagesQuery,
      manufacturers: manufacturersQuery,
    },

    // Computed properties for convenience
    isLoading:
      categoriesQuery.isLoading ||
      typesQuery.isLoading ||
      packagesQuery.isLoading ||
      inventoryUnitsQuery.isLoading ||
      unitsQuery.isLoading ||
      dosagesQuery.isLoading ||
      manufacturersQuery.isLoading,

    isError:
      categoriesQuery.isError ||
      typesQuery.isError ||
      packagesQuery.isError ||
      inventoryUnitsQuery.isError ||
      unitsQuery.isError ||
      dosagesQuery.isError ||
      manufacturersQuery.isError,

    errors: {
      categories: categoriesQuery.error,
      types: typesQuery.error,
      packages: packagesQuery.error,
      inventoryUnits: inventoryUnitsQuery.error,
      units: unitsQuery.error,
      dosages: dosagesQuery.error,
      manufacturers: manufacturersQuery.error,
    },
  };
};

/**
 * Individual query hooks for more granular usage
 *
 * These are also generated using the factory system and can be used
 * independently when you only need specific entity data.
 */
export const {
  categories: useCategoriesQuery,
  types: useTypesQuery,
  packages: usePackagesQuery,
  inventoryUnits: useInventoryUnitsQuery,
  units: useUnitsQuery,
  dosages: useDosagesQuery,
  manufacturers: useManufacturersQuery,
} = useEntityQueries;
