import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCategoriesQuery,
  useDosagesQuery,
  useItemQueries,
  useManufacturersQuery,
  usePackagesQuery,
  useTypesQuery,
  useUnitsQuery,
} from './useItemQueries';

const queryHooks = vi.hoisted(() => ({
  categories: vi.fn(),
  types: vi.fn(),
  packages: vi.fn(),
  units: vi.fn(),
  dosages: vi.fn(),
  manufacturers: vi.fn(),
}));

vi.mock('./GenericHookFactories', () => ({
  useEntityQueries: queryHooks,
}));

const createQueryState = (
  overrides: Partial<{
    data: unknown[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }> = {}
) => ({
  data: [],
  isLoading: false,
  isError: false,
  error: null,
  ...overrides,
});

describe('useItemQueries', () => {
  beforeEach(() => {
    queryHooks.categories.mockReturnValue(
      createQueryState({ data: [{ id: 'cat-1' }] })
    );
    queryHooks.types.mockReturnValue(
      createQueryState({ data: [{ id: 'typ-1' }] })
    );
    queryHooks.packages.mockReturnValue(
      createQueryState({ data: [{ id: 'pkg-1' }] })
    );
    queryHooks.units.mockReturnValue(
      createQueryState({ data: [{ id: 'unt-1' }] })
    );
    queryHooks.dosages.mockReturnValue(
      createQueryState({ data: [{ id: 'dos-1' }] })
    );
    queryHooks.manufacturers.mockReturnValue(
      createQueryState({ data: [{ id: 'man-1' }] })
    );
  });

  it('returns mapped data and full query objects', () => {
    const { result } = renderHook(() => useItemQueries());

    expect(result.current.categoriesData).toEqual([{ id: 'cat-1' }]);
    expect(result.current.typesData).toEqual([{ id: 'typ-1' }]);
    expect(result.current.packagesData).toEqual([{ id: 'pkg-1' }]);
    expect(result.current.unitsData).toEqual([{ id: 'unt-1' }]);
    expect(result.current.dosagesData).toEqual([{ id: 'dos-1' }]);
    expect(result.current.manufacturersData).toEqual([{ id: 'man-1' }]);

    expect(result.current.queries.categories).toMatchObject({
      data: [{ id: 'cat-1' }],
      isLoading: false,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.errors.categories).toBeNull();
  });

  it('computes aggregate loading and error states across all entity queries', () => {
    const dosagesError = new Error('dosage query failed');
    queryHooks.units.mockReturnValue(createQueryState({ isLoading: true }));
    queryHooks.dosages.mockReturnValue(
      createQueryState({ isError: true, error: dosagesError })
    );

    const { result } = renderHook(() => useItemQueries());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
    expect(result.current.errors.dosages).toBe(dosagesError);
  });

  it('re-exports individual entity hooks from useEntityQueries', () => {
    queryHooks.categories.mockReturnValue(createQueryState({ data: ['C'] }));
    queryHooks.types.mockReturnValue(createQueryState({ data: ['T'] }));
    queryHooks.packages.mockReturnValue(createQueryState({ data: ['P'] }));
    queryHooks.units.mockReturnValue(createQueryState({ data: ['U'] }));
    queryHooks.dosages.mockReturnValue(createQueryState({ data: ['D'] }));
    queryHooks.manufacturers.mockReturnValue(createQueryState({ data: ['M'] }));

    expect(useCategoriesQuery()).toMatchObject({ data: ['C'] });
    expect(useTypesQuery()).toMatchObject({ data: ['T'] });
    expect(usePackagesQuery()).toMatchObject({ data: ['P'] });
    expect(useUnitsQuery()).toMatchObject({ data: ['U'] });
    expect(useDosagesQuery()).toMatchObject({ data: ['D'] });
    expect(useManufacturersQuery()).toMatchObject({ data: ['M'] });
  });
});
