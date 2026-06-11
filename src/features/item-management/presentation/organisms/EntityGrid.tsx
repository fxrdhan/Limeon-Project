import type {
  FirstDataRenderedEvent,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  RowGroupOpenedEvent,
} from 'ag-grid-community';
import type { AgGridReact } from 'ag-grid-react';
import { memo, useCallback, useRef, useState } from 'react';
import DataGrid from '@/components/ag-grid/DataGrid';
import type { TableType } from '@/utils/gridStateManager';
import StandardPagination from '../atoms/StandardPagination';
import { useEntityGridMenuItems } from './entity-grid/useEntityGridMenuItems';
import { useEntityGridOptions } from './entity-grid/useEntityGridOptions';
import { useEntityGridRows } from './entity-grid/useEntityGridRows';
import { useEntityGridStatePersistence } from './entity-grid/useEntityGridStatePersistence';
import type { EntityGridProps, EntityGridRow } from './entity-grid/types';

const EntityGrid = memo<EntityGridProps>(function EntityGrid({
  activeTab,
  /* c8 ignore next */
  itemsData = [],
  /* c8 ignore next */
  suppliersData = [],
  entityData = [],
  isLoading,
  isError,
  error,
  search,
  itemColumnDefs = [],
  supplierColumnDefs = [],
  isRowGroupingEnabled = false,
  defaultExpanded = 1,
  showGroupPanel = true,
  entityConfig,
  entityColumnDefs = [],
  onRowClick,
  onGridReady,
  isExternalFilterPresent,
  doesExternalFilterPass,
  onGridApiReady,
  onFilterChanged,
  itemsPerPage = 25,
  hideFloatingPagination = false,
}) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const dataGridRef = useRef<AgGridReact>(null);

  const {
    applySavedPaginationState,
    handlePageSizeChange,
    handleStateUpdated,
    hasSavedGridState,
    initialGridState,
    readSavedGridState,
    syncPaginationUiState,
  } = useEntityGridStatePersistence({
    activeTab,
    gridApi,
    itemsPerPage,
  });

  const {
    columnDefs,
    columnDisplayModes,
    isReferenceColumn,
    rowData,
    toggleColumnDisplayMode,
  } = useEntityGridRows({
    activeTab,
    entityColumnDefs,
    entityData,
    gridApi,
    itemColumnDefs,
    itemsData,
    supplierColumnDefs,
    suppliersData,
  });

  const getMainMenuItems = useEntityGridMenuItems({
    activeTab,
    columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode,
  });

  const { autoGroupColumnDef, overlayNoRowsTemplate, sideBarConfig } =
    useEntityGridOptions({
      activeTab,
      entityConfig,
      hasSavedGridState,
      isRowGroupingEnabled,
      readSavedGridState,
      search,
    });

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<EntityGridRow>) => {
      if (event.node.group) {
        return;
      }

      if (event.data) {
        onRowClick(event.data);
      }
    },
    [onRowClick]
  );

  const handleGridReady = useCallback(
    (params: GridReadyEvent<EntityGridRow>) => {
      const tableType = activeTab as TableType;
      const savedState = readSavedGridState(tableType);

      applySavedPaginationState(
        params.api,
        tableType,
        savedState,
        itemsPerPage
      );
      syncPaginationUiState(params.api);
      setGridApi(params.api);

      if (onGridApiReady) {
        onGridApiReady(params.api);
      }

      onGridReady(params);
    },
    [
      activeTab,
      applySavedPaginationState,
      itemsPerPage,
      onGridApiReady,
      onGridReady,
      readSavedGridState,
      syncPaginationUiState,
    ]
  );

  const handleFirstDataRendered = useCallback(
    (event: FirstDataRenderedEvent) => {
      /* c8 ignore start */
      const api = event.api;
      const tableType = activeTab as TableType;

      if (api && !api.isDestroyed() && !hasSavedGridState(tableType)) {
        api.autoSizeAllColumns();
      }
      /* c8 ignore end */
    },
    [activeTab, hasSavedGridState]
  );

  const handleRowDataUpdated = useCallback(() => {}, []);

  const handleFilterChanged = useCallback(() => {
    if (onFilterChanged && gridApi && !gridApi.isDestroyed()) {
      const filterModel = gridApi.getFilterModel();
      onFilterChanged(filterModel);
    }
  }, [gridApi, onFilterChanged]);

  const handleRowGroupOpened = useCallback(
    (event: RowGroupOpenedEvent<EntityGridRow>) => {
      /* c8 ignore next 3 */
      if (activeTab !== 'items' || !isRowGroupingEnabled) {
        return;
      }

      if (event.expanded && gridApi && !gridApi.isDestroyed()) {
        const rowNodeIndex = event.node.rowIndex;

        if (rowNodeIndex !== null && rowNodeIndex !== undefined) {
          const childCount = event.node.childrenAfterSort
            ? event.node.childrenAfterSort.length
            : 0;
          const newIndex = rowNodeIndex + childCount;

          gridApi.ensureIndexVisible(newIndex);
        }
      }
    },
    [activeTab, gridApi, isRowGroupingEnabled]
  );

  if (isError) {
    return (
      <div className="p-6 text-center text-red-500">
        Error: {error instanceof Error ? error.message : 'Gagal memuat data'}
      </div>
    );
  }

  const shouldShowGridLoading = isLoading && rowData.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 py-4">
        <DataGrid
          ref={dataGridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          initialState={initialGridState}
          onRowClicked={handleRowClicked}
          onGridReady={handleGridReady}
          onFirstDataRendered={handleFirstDataRendered}
          onRowDataUpdated={handleRowDataUpdated}
          loading={shouldShowGridLoading}
          overlayNoRowsTemplate={overlayNoRowsTemplate}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          getMainMenuItems={getMainMenuItems}
          enableFilterHandlers={true}
          rowSelection={{
            mode: 'multiRow',
            checkboxes: false,
            headerCheckbox: false,
          }}
          onStateUpdated={handleStateUpdated}
          onFilterChanged={handleFilterChanged}
          rowNumbers={true}
          domLayout="normal"
          style={{
            width: '100%',
            height: '100%',
            transition: 'height 0.3s ease-in-out',
          }}
          pagination={true}
          paginationPageSize={itemsPerPage}
          suppressPaginationPanel={true}
          rowGroupPanelShow={
            activeTab === 'items' && isRowGroupingEnabled && showGroupPanel
              ? 'always'
              : 'never'
          }
          suppressAggFuncInHeader={false}
          suppressDragLeaveHidesColumns={true}
          groupDefaultExpanded={
            activeTab === 'items' && isRowGroupingEnabled
              ? defaultExpanded
              : undefined
          }
          autoGroupColumnDef={autoGroupColumnDef}
          groupDisplayType="singleColumn"
          onRowGroupOpened={handleRowGroupOpened}
          sideBar={sideBarConfig}
          suppressColumnMoveAnimation={true}
          enableAdvancedFilter={true}
        />
      </div>

      <StandardPagination
        gridApi={gridApi}
        hideFloatingWhenModalOpen={hideFloatingPagination}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
});

export default EntityGrid;
