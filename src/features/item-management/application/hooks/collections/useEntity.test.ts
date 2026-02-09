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

  it('matches description/address/nci/abbreviation fields and uses secondary sorting fallback', () => {
    getExternalHooksMock.mockReturnValue({
      useData: () => ({
        data: [
          {
            id: 'a',
            code: 'B-2',
            name: 'Beta Code',
            address: 'token street',
          },
          {
            id: 'b',
            code: 'A-1',
            name: 'Alpha Code',
            address: 'token boulevard',
          },
          {
            id: 'c',
            name: 'Zulu Name',
            description: 'token description',
          },
          {
            id: 'd',
            name: 'Alpha No Code',
            description: 'token details',
          },
          {
            id: 'e',
            name: 'Package Entity',
            nci_code: 'token-nci',
          },
          {
            id: 'f',
            name: 'Unit Entity',
            abbreviation: 'token-abb',
          },
          {
            id: 'g',
            name: 'prefix token inside',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        isPlaceholderData: false,
      }),
      useMutations: () => ({ update: vi.fn() }),
    });

    const { result } = renderHook(() =>
      useEntity({
        entityType: 'manufacturers',
        search: 'token',
      })
    );

    const ids = result.current.data.map(item => item.id);
    expect(ids).toEqual(
      expect.arrayContaining(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    );

    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('a'));
    expect(ids.indexOf('d')).toBeLessThan(ids.indexOf('c'));
  });

  it('uses fuzzy name match when startsWith/includes checks do not match', () => {
    fuzzyMatchMock.mockImplementation((value: string, query: string) => {
      const normalizedValue = value.toLowerCase();
      const normalizedQuery = query.toLowerCase();
      return (
        normalizedValue.includes(normalizedQuery) ||
        (normalizedValue === 'cefalexin' && normalizedQuery === 'cfa')
      );
    });

    getExternalHooksMock.mockReturnValue({
      useData: () => ({
        data: [
          {
            id: 'fuzzy-1',
            name: 'Cefalexin',
          },
          {
            id: 'fuzzy-2',
            name: 'No Match',
          },
        ],
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
        entityType: 'types',
        search: 'cfa',
      })
    );

    expect(result.current.data.map(item => item.id)).toEqual(['fuzzy-1']);
  });
});
