import { useCallback, useState } from 'react';
import { GridApi, GridReadyEvent } from 'ag-grid-community';

import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
import type { SearchColumn } from '@/types/search';

interface UseMasterDataListOptions<TData> {
  data?: TData[];
  searchColumns: SearchColumn[];
  setSearch: (value: string) => void;
  viewportOffset?: number;
}

export const useMasterDataList = <TData>({
  data,
  searchColumns,
  setSearch,
  viewportOffset = 320,
}: UseMasterDataListOptions<TData>) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);

  const handleSearch = useCallback(
    (searchValue: string) => {
      setSearch(searchValue);
    },
    [setSearch]
  );

  const handleClear = useCallback(() => {
    setSearch('');
  }, [setSearch]);

  const {
    search,
    onGridReady: unifiedSearchOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: searchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);

      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      unifiedSearchOnGridReady(params);
    },
    [unifiedSearchOnGridReady]
  );

  const { gridHeight } = useDynamicGridHeight({
    data: data ?? [],
    currentPageSize,
    viewportOffset,
  });

  return {
    gridApi,
    currentPageSize,
    setCurrentPageSize,
    gridHeight,
    handleGridReady,
    search,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  };
};
