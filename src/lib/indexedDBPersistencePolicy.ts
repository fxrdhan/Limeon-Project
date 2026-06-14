type QueryKeyFactory = (
  filters?: Record<string, unknown>
) => readonly unknown[];

interface CriticalQueryKeyRegistry {
  items: {
    list: QueryKeyFactory;
  };
  masterData: {
    categories: {
      list: QueryKeyFactory;
    };
    dosages: {
      list: QueryKeyFactory;
    };
    itemUnits: {
      list: QueryKeyFactory;
    };
    manufacturers: {
      list: QueryKeyFactory;
    };
    packages: {
      list: QueryKeyFactory;
    };
    types: {
      list: QueryKeyFactory;
    };
  };
}

const PERSISTED_QUERY_ROOT_KEYS = ['masterData', 'items', 'item_units'];

export const shouldPersistQueryRootKey = (queryKey: unknown) =>
  typeof queryKey === 'string' && PERSISTED_QUERY_ROOT_KEYS.includes(queryKey);

export const getCriticalPersistedQueryKeys = (
  queryKeys: CriticalQueryKeyRegistry
) => [
  queryKeys.items.list(undefined),
  queryKeys.masterData.categories.list(undefined),
  queryKeys.masterData.types.list(undefined),
  queryKeys.masterData.packages.list(undefined),
  queryKeys.masterData.dosages.list(undefined),
  queryKeys.masterData.manufacturers.list(undefined),
  queryKeys.masterData.itemUnits.list(undefined),
];
