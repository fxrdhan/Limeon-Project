import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemsManagement } from './useItemsManagement';

const useItemsMock = vi.hoisted(() => vi.fn());
const fuzzyMatchMock = vi.hoisted(() => vi.fn());
const getScoreMock = vi.hoisted(() => vi.fn());
const preloadImagesMock = vi.hoisted(() => vi.fn());
const setCachedImageSetMock = vi.hoisted(() => vi.fn());
const removeCachedImageSetMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/queries/useItems', () => ({
  useItems: useItemsMock,
}));

vi.mock('@/utils/search', () => ({
  fuzzyMatch: fuzzyMatchMock,
  getScore: getScoreMock,
}));

vi.mock('@/utils/imageCache', () => ({
  preloadImages: preloadImagesMock,
  setCachedImageSet: setCachedImageSetMock,
  removeCachedImageSet: removeCachedImageSetMock,
}));

const baseItems = [
  {
    id: 'item-1',
    name: 'Paracetamol Forte',
    code: 'PRC-001',
    barcode: '12345',
    category: { name: 'Analgesik' },
    type: { name: 'Tablet' },
    unit: { name: 'Strip' },
    base_price: 1000,
    sell_price: 1500,
    stock: 12,
    package_conversions: [{ unit: { name: 'Box' } }],
    image_urls: ['https://cdn/item1.png', ''],
  },
  {
    id: 'item-2',
    name: 'Amoxicillin',
    code: 'AMX-002',
    barcode: '67890',
    category: { name: 'Antibiotik' },
    type: { name: 'Capsule' },
    unit: { name: 'Bottle' },
    base_price: 2000,
    sell_price: 3000,
    stock: 0,
    package_conversions: [],
    image_urls: [],
  },
  {
    id: '',
    name: 'Qqq',
    package_conversions: [],
    image_urls: ['https://cdn/ignored.png'],
  },
];

describe('useItemsManagement', () => {
  beforeEach(() => {
    useItemsMock.mockReset();
    fuzzyMatchMock.mockReset();
    getScoreMock.mockReset();
    preloadImagesMock.mockReset();
    setCachedImageSetMock.mockReset();
    removeCachedImageSetMock.mockReset();

    useItemsMock.mockReturnValue({
      data: baseItems,
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      isPlaceholderData: false,
    });

    fuzzyMatchMock.mockImplementation((value: string, query: string) =>
      value.toLowerCase().includes(query.toLowerCase())
    );
    getScoreMock.mockImplementation((item: { id: string }) => {
      if (item.id === 'item-1') return 10;
      if (item.id === 'item-2') return 5;
      return 0;
    });
  });

  it('loads items, initializes state, and syncs image cache side effects', () => {
    const { result } = renderHook(() =>
      useItemsManagement({
        enabled: false,
        initialSearch: '',
      })
    );

    expect(useItemsMock).toHaveBeenCalledWith({
      enabled: false,
      orderBy: {
        column: 'name',
        ascending: true,
      },
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.search).toBe('');
    expect(result.current.itemsPerPage).toBe(20);
    expect(result.current.hasData).toBe(true);
    expect(result.current.isEmpty).toBe(false);

    expect(setCachedImageSetMock).toHaveBeenCalledWith('item-images:item-1', [
      'https://cdn/item1.png',
      '',
    ]);
    expect(preloadImagesMock).toHaveBeenCalledWith(['https://cdn/item1.png']);
    expect(removeCachedImageSetMock).toHaveBeenCalledWith('item-images:item-2');
  });

  it('filters and sorts items using fuzzy search + score ranking', () => {
    const { result } = renderHook(() => useItemsManagement());

    act(() => {
      result.current.setSearch('a');
    });

    expect(result.current.data.map(item => item.id)).toEqual([
      'item-1',
      'item-2',
    ]);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.hasData).toBe(true);

    expect(fuzzyMatchMock).toHaveBeenCalled();
    expect(getScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'item-1' }),
      'a'
    );
  });

  it('exposes pagination setter and empty-state flags when no data matches search', () => {
    const { result } = renderHook(() => useItemsManagement());

    act(() => {
      result.current.setItemsPerPage(50);
      result.current.setSearch('zzz-no-match');
    });

    expect(result.current.itemsPerPage).toBe(50);
    expect(result.current.data).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.hasData).toBe(false);
  });

  it('falls back to name sort when item search scores are tied', () => {
    useItemsMock.mockReturnValue({
      data: [
        {
          id: 'item-a',
          name: 'Beta Item',
          code: 'B-1',
          package_conversions: [],
          image_urls: [],
        },
        {
          id: 'item-b',
          name: 'Alpha Item',
          code: 'A-1',
          package_conversions: [],
          image_urls: [],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      isPlaceholderData: false,
    });
    getScoreMock.mockReturnValue(1);

    const { result } = renderHook(() => useItemsManagement());
    act(() => {
      result.current.setSearch('item');
    });

    expect(result.current.data.map(item => item.name)).toEqual([
      'Alpha Item',
      'Beta Item',
    ]);
  });
});
