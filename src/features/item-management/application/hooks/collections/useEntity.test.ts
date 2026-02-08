import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntity } from './useEntity';

const fuzzyMatchMock = vi.hoisted(() => vi.fn());
const getExternalHooksMock = vi.hoisted(() => vi.fn());
const isEntityTypeSupportedMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/search', () => ({
  fuzzyMatch: fuzzyMatchMock,
}));

vi.mock('../core/GenericHookFactories', () => ({
  getExternalHooks: getExternalHooksMock,
  isEntityTypeSupported: isEntityTypeSupportedMock,
}));

describe('useEntity', () => {
  beforeEach(() => {
    fuzzyMatchMock.mockReset();
    getExternalHooksMock.mockReset();
    isEntityTypeSupportedMock.mockReset();

    fuzzyMatchMock.mockImplementation((value: string, query: string) =>
      value.toLowerCase().includes(query.toLowerCase())
    );
    isEntityTypeSupportedMock.mockReturnValue(true);
  });

  it('filters and sorts entities by code/name relevance for search', () => {
    const allData = [
      {
        id: '1',
        code: 'AB-001',
        name: 'Amoxicillin',
        description: 'Antibiotik',
      },
      {
        id: '2',
        code: 'ZX-AB',
        name: 'Random Item',
        description: 'misc',
      },
      {
        id: '3',
        code: 'CC-001',
        name: 'Abacavir',
        description: 'HIV',
      },
      {
        id: '4',
        code: 'DD-001',
        name: 'No Match',
        description: 'none',
      },
    ];

    getExternalHooksMock.mockReturnValue({
      useData: () => ({
        data: allData,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        isPlaceholderData: false,
      }),
      useMutations: () => ({ create: vi.fn() }),
    });

    const { result } = renderHook(() =>
      useEntity({
        entityType: 'categories',
        search: 'ab',
        itemsPerPage: 2,
      })
    );

    expect(result.current.data.map(item => item.id)).toEqual(['1', '2', '3']);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.hasData).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it('returns all data when no search term is provided', () => {
    getExternalHooksMock.mockReturnValue({
      useData: () => ({
        data: [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ],
        isLoading: true,
        isError: false,
        error: null,
        isFetching: true,
        isPlaceholderData: true,
      }),
      useMutations: () => ({ update: vi.fn() }),
    });

    const { result } = renderHook(() =>
      useEntity({
        entityType: 'types',
        search: '',
        enabled: false,
      })
    );

    expect(result.current.data).toHaveLength(2);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('throws for unsupported entity types', () => {
    isEntityTypeSupportedMock.mockReturnValue(false);

    expect(() =>
      renderHook(() =>
        useEntity({
          entityType: 'categories',
        })
      )
    ).toThrow('Unsupported entity type: categories');
  });
});
