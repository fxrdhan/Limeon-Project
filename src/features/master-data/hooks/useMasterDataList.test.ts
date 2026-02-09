import { act, renderHook } from '@testing-library/react';
import type { GridReadyEvent } from 'ag-grid-community';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMasterDataList } from './useMasterDataList';

const useUnifiedSearchMock = vi.hoisted(() => vi.fn());
const useDynamicGridHeightMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/data/useUnifiedSearch', () => ({
  useUnifiedSearch: (options: Record<string, unknown>) =>
    useUnifiedSearchMock(options),
}));

vi.mock('@/hooks/ag-grid/useDynamicGridHeight', () => ({
  useDynamicGridHeight: (options: Record<string, unknown>) =>
    useDynamicGridHeightMock(options),
}));

describe('useMasterDataList', () => {
  beforeEach(() => {
    useUnifiedSearchMock.mockReset();
    useDynamicGridHeightMock.mockReset();
  });

  it('wires search callbacks and updates grid api/page size on grid ready', () => {
    const setSearch = vi.fn();
    const unifiedOnGridReady = vi.fn();
    let capturedUnifiedSearchOptions: Record<string, unknown> | null = null;

    useUnifiedSearchMock.mockImplementation(
      (options: Record<string, unknown>) => {
        capturedUnifiedSearchOptions = options;
        return {
          search: 'abc',
          onGridReady: unifiedOnGridReady,
          isExternalFilterPresent: vi.fn(() => true),
          doesExternalFilterPass: vi.fn(() => true),
          searchBarProps: { value: 'abc' },
        };
      }
    );
    useDynamicGridHeightMock.mockReturnValue({ gridHeight: 640 });

    const { result } = renderHook(() =>
      useMasterDataList({
        data: [{ id: '1', name: 'Data' }],
        searchColumns: [{ field: 'name', label: 'Nama' }],
        setSearch,
        viewportOffset: 410,
      })
    );

    expect(capturedUnifiedSearchOptions).toMatchObject({
      columns: [{ field: 'name', label: 'Nama' }],
      searchMode: 'hybrid',
      useFuzzySearch: true,
      data: [{ id: '1', name: 'Data' }],
    });

    if (!capturedUnifiedSearchOptions) {
      throw new Error('Expected search options to be captured');
    }

    const { onSearch, onClear } = capturedUnifiedSearchOptions as {
      onSearch: (value: string) => void;
      onClear: () => void;
    };

    act(() => {
      onSearch('sari');
      onClear();
    });

    expect(setSearch).toHaveBeenNthCalledWith(1, 'sari');
    expect(setSearch).toHaveBeenNthCalledWith(2, '');

    expect(useDynamicGridHeightMock).toHaveBeenCalledWith({
      data: [{ id: '1', name: 'Data' }],
      currentPageSize: 25,
      viewportOffset: 410,
    });
    expect(result.current.gridHeight).toBe(640);
    expect(result.current.search).toBe('abc');
    expect(result.current.searchBarProps).toEqual({ value: 'abc' });

    const api = {
      paginationGetPageSize: vi.fn(() => 50),
    };
    const event = { api } as unknown as GridReadyEvent;

    act(() => {
      result.current.handleGridReady(event);
    });

    expect(unifiedOnGridReady).toHaveBeenCalledWith(event);
    expect(result.current.gridApi).toBe(api);
    expect(result.current.currentPageSize).toBe(50);
  });

  it('uses default viewport offset and empty array when data is undefined', () => {
    useUnifiedSearchMock.mockReturnValue({
      search: '',
      onGridReady: vi.fn(),
      isExternalFilterPresent: vi.fn(() => false),
      doesExternalFilterPass: vi.fn(() => true),
      searchBarProps: {},
    });
    useDynamicGridHeightMock.mockReturnValue({ gridHeight: 320 });

    const setSearch = vi.fn();
    const { result } = renderHook(() =>
      useMasterDataList({
        data: undefined,
        searchColumns: [],
        setSearch,
      })
    );

    expect(useDynamicGridHeightMock).toHaveBeenCalledWith({
      data: [],
      currentPageSize: 25,
      viewportOffset: 320,
    });

    act(() => {
      result.current.setCurrentPageSize(75);
    });
    expect(result.current.currentPageSize).toBe(75);
  });
});
