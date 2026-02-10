import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEntityMutations,
  createEntityQuery,
  createUnifiedEntityHook,
  getEntityConfigForType,
  getExternalHooks,
  isEntityTypeSupported,
  useBatchEntityQueries,
  useEntityMutations,
  useEntityQueries,
} from './GenericHookFactories';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const listMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const constructorMock = vi.hoisted(() => vi.fn());

const useCategoriesMock = vi.hoisted(() => vi.fn(() => 'external-categories'));
const useCategoryMutationsMock = vi.hoisted(() =>
  vi.fn(() => 'external-category-mutations')
);
const useDosagesMock = vi.hoisted(() => vi.fn(() => 'external-dosages'));
const useDosageMutationsMock = vi.hoisted(() =>
  vi.fn(() => 'external-dosage-mutations')
);
const useManufacturersMock = vi.hoisted(() =>
  vi.fn(() => 'external-manufacturers')
);
const useManufacturerMutationsMock = vi.hoisted(() =>
  vi.fn(() => 'external-manufacturer-mutations')
);

const queryConfigMap = vi.hoisted(
  () =>
    ({
      categories: {
        tableName: 'item_categories',
        queryKey: ['masterData', 'categories'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'kategori',
      },
      types: {
        tableName: 'item_types',
        queryKey: ['masterData', 'types'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'jenis',
      },
      packages: {
        tableName: 'item_packages',
        queryKey: ['masterData', 'packages'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'kemasan',
      },
      units: {
        tableName: 'item_units',
        queryKey: ['masterData', 'units'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'satuan',
      },
      dosages: {
        tableName: 'item_dosages',
        queryKey: ['masterData', 'dosages'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'sediaan',
      },
      manufacturers: {
        tableName: 'item_manufacturers',
        queryKey: ['masterData', 'manufacturers'],
        selectFields: 'id, name',
        orderByField: 'name',
        entityDisplayName: 'produsen',
      },
    }) as const
);

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/genericEntity.service', () => ({
  GenericEntityService: class {
    constructor(tableName: string) {
      constructorMock(tableName);
    }
    list = listMock;
    create = createMock;
    update = updateMock;
    delete = deleteMock;
  },
}));

vi.mock('./EntityHookConfigurations', () => ({
  getEntityConfig: vi.fn((entityType: string) => ({
    entityType,
    tableName:
      queryConfigMap[entityType as keyof typeof queryConfigMap]?.tableName,
  })),
  getQueryConfig: vi.fn(
    (entityType: keyof typeof queryConfigMap) => queryConfigMap[entityType]
  ),
  getMutationConfig: vi.fn(
    (entityType: keyof typeof queryConfigMap) => queryConfigMap[entityType]
  ),
  ENTITY_CONFIGURATIONS: {
    categories: {},
    types: {},
    packages: {},
    units: {},
    dosages: {},
    manufacturers: {},
  },
}));

vi.mock('@/hooks/queries/useMasterData', () => ({
  useCategories: useCategoriesMock,
  useMedicineTypes: vi.fn(() => 'external-types'),
  usePackages: vi.fn(() => 'external-packages'),
  useItemUnits: vi.fn(() => 'external-units'),
  useCategoryMutations: useCategoryMutationsMock,
  useMedicineTypeMutations: vi.fn(() => 'external-type-mutations'),
  usePackageMutations: vi.fn(() => 'external-package-mutations'),
  useItemUnitMutations: vi.fn(() => 'external-unit-mutations'),
}));

vi.mock('@/hooks/queries/useDosages', () => ({
  useDosages: useDosagesMock,
  useDosageMutations: useDosageMutationsMock,
}));

vi.mock('@/hooks/queries/useManufacturers', () => ({
  useManufacturers: useManufacturersMock,
  useManufacturerMutations: useManufacturerMutationsMock,
}));

describe('GenericHookFactories', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    constructorMock.mockReset();

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: Record<string, unknown>) => config
    );
    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (arg: unknown) => Promise<unknown>;
        onSuccess?: (...args: unknown[]) => void;
        onError?: (...args: unknown[]) => void;
      }) => ({
        mutateAsync: async (arg: unknown) => {
          try {
            const result = await config.mutationFn(arg);
            config.onSuccess?.(result, arg, undefined);
            return result;
          } catch (error) {
            config.onError?.(error as Error, arg, undefined);
            throw error;
          }
        },
      })
    );
  });

  it('creates query hooks and resolves query function with filters/order/select', async () => {
    listMock.mockResolvedValueOnce({
      data: [{ id: 'cat-1' }],
      error: null,
    });

    const useCategoriesQuery = createEntityQuery('categories');
    const result = useCategoriesQuery({
      filters: { active: true },
      orderBy: { column: 'id', ascending: false },
      select: ['id', 'name'],
    });

    await expect((result.queryFn as () => Promise<unknown>)()).resolves.toEqual(
      [{ id: 'cat-1' }]
    );
    expect(listMock).toHaveBeenCalledWith({
      select: 'id, name',
      filters: { active: true },
      orderBy: { column: 'id', ascending: false },
    });
  });

  it('throws from queryFn when service returns error', async () => {
    listMock.mockResolvedValueOnce({
      data: null,
      error: new Error('query failed'),
    });

    const queryHook = createEntityQuery('categories');
    const result = queryHook();
    await expect((result.queryFn as () => Promise<unknown>)()).rejects.toThrow(
      'query failed'
    );

    listMock.mockResolvedValueOnce({ data: null, error: null });
    await expect((result.queryFn as () => Promise<unknown>)()).resolves.toEqual(
      []
    );
  });

  it('creates mutation hooks with invalidation and error handling', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    createMock.mockResolvedValueOnce({ data: { id: 'new-cat' }, error: null });
    updateMock.mockResolvedValueOnce({
      data: { id: 'cat-1', name: 'Updated' },
      error: null,
    });
    deleteMock.mockResolvedValueOnce({ error: null });

    const mutations = createEntityMutations('categories');

    const createResult = await mutations
      .useCreate({ onSuccess, onError })
      .mutateAsync({ name: 'A' });
    expect(createResult).toEqual({ id: 'new-cat' });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['masterData', 'categories'],
    });
    expect(onSuccess).toHaveBeenCalled();

    const updateResult = await mutations
      .useUpdate({ onSuccess, onError })
      .mutateAsync({ id: 'cat-1', name: 'Updated' });
    expect(updateResult).toEqual({ id: 'cat-1', name: 'Updated' });

    await mutations.useDelete({ onSuccess, onError }).mutateAsync('cat-1');
    expect(deleteMock).toHaveBeenCalledWith('cat-1');

    createMock.mockResolvedValueOnce({
      data: null,
      error: new Error('create failed'),
    });
    await expect(
      mutations.useCreate({ onError }).mutateAsync({ name: 'B' })
    ).rejects.toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalled();

    updateMock.mockResolvedValueOnce({
      data: null,
      error: new Error('update failed'),
    });
    await expect(
      mutations
        .useUpdate({ onError, invalidateQueries: false })
        .mutateAsync({ id: 'cat-2', name: 'B' })
    ).rejects.toBeInstanceOf(Error);

    deleteMock.mockResolvedValueOnce({
      error: new Error('delete failed'),
    });
    await expect(
      mutations.useDelete({ onError }).mutateAsync('cat-2')
    ).rejects.toBeInstanceOf(Error);

    const invalidateCallsBefore = invalidateQueriesMock.mock.calls.length;
    createMock.mockResolvedValueOnce({ data: { id: 'new-2' }, error: null });
    await mutations
      .useCreate({ invalidateQueries: false, onSuccess })
      .mutateAsync({ name: 'NoInvalidate' });
    expect(invalidateQueriesMock.mock.calls.length).toBe(invalidateCallsBefore);

    const beforeUpdateNoInvalidate = invalidateQueriesMock.mock.calls.length;
    updateMock.mockResolvedValueOnce({ data: { id: 'cat-3' }, error: null });
    await mutations
      .useUpdate({ invalidateQueries: false, onSuccess })
      .mutateAsync({ id: 'cat-3', name: 'NoInvalidateUpdate' });
    expect(invalidateQueriesMock.mock.calls.length).toBe(
      beforeUpdateNoInvalidate
    );

    const beforeDeleteNoInvalidate = invalidateQueriesMock.mock.calls.length;
    deleteMock.mockResolvedValueOnce({ error: null });
    await mutations
      .useDelete({ invalidateQueries: false })
      .mutateAsync('cat-3');
    expect(invalidateQueriesMock.mock.calls.length).toBe(
      beforeDeleteNoInvalidate
    );
  });

  it('exposes external/internal unified hooks and helper utilities', () => {
    const external = createUnifiedEntityHook('categories', true);
    expect(external.useData()).toBe('external-categories');
    expect(external.useMutations()).toBe('external-category-mutations');

    const internal = createUnifiedEntityHook('categories', false);
    expect(internal.useData).toBe(useEntityQueries.categories);
    expect(internal.useMutations).toBe(useEntityMutations.categories);

    const hooks = getExternalHooks('dosages');
    expect(hooks.useData()).toBe('external-dosages');
    expect(hooks.useMutations()).toBe('external-dosage-mutations');

    expect(() => getExternalHooks('unknown' as never)).toThrow(
      'No external hooks configured'
    );

    const batch = useBatchEntityQueries(['categories', 'manufacturers']);
    expect(batch).toHaveProperty('categories');
    expect(batch).toHaveProperty('manufacturers');

    expect(getEntityConfigForType('categories')).toMatchObject({
      entityType: 'categories',
    });
    expect(isEntityTypeSupported('categories')).toBe(true);
    expect(isEntityTypeSupported('unknown')).toBe(false);
  });
});
