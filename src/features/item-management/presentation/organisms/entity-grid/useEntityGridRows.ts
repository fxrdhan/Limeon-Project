import type { GridApi } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useColumnDisplayMode } from '@/features/item-management/application/hooks/ui/useColumnDisplayMode';
import { useItemsDisplayTransform } from '@/features/item-management/application/hooks/ui/useItemsDisplayTransform';
import type { MasterDataType } from '@/features/item-management/shared/types';
import type {
  Customer,
  Doctor,
  Item,
  Patient,
  Supplier,
} from '@/types/database';
import type { EntityData } from '../../../application/hooks/collections/useEntityManager';
import type { EntityGridColumnDef, EntityGridRow } from './types';

interface UseEntityGridRowsParams {
  activeTab: MasterDataType;
  gridApi: GridApi | null;
  itemsData: Item[];
  suppliersData: Supplier[];
  entityData: (EntityData | Customer | Patient | Doctor)[];
  itemColumnDefs: EntityGridColumnDef[];
  supplierColumnDefs: EntityGridColumnDef[];
  entityColumnDefs: EntityGridColumnDef[];
}

export const useEntityGridRows = ({
  activeTab,
  gridApi,
  itemsData,
  suppliersData,
  entityData,
  itemColumnDefs,
  supplierColumnDefs,
  entityColumnDefs,
}: UseEntityGridRowsParams) => {
  const autoSizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  const itemsForDisplay = useItemsDisplayTransform(
    itemsData,
    columnDisplayModes
  );

  const { rowData, columnDefs } = useMemo(() => {
    let data: EntityGridRow[] = [];
    let columns: EntityGridColumnDef[] = [];

    if (activeTab === 'items') {
      data = itemsForDisplay || [];
      columns = itemColumnDefs;
    } else if (activeTab === 'suppliers') {
      data = suppliersData;
      columns = supplierColumnDefs;
    } else {
      data = entityData;
      columns = entityColumnDefs;
    }

    return { rowData: data, columnDefs: columns };
  }, [
    activeTab,
    entityColumnDefs,
    entityData,
    itemColumnDefs,
    itemsForDisplay,
    supplierColumnDefs,
    suppliersData,
  ]);

  const clearAutoSizeTimeout = useCallback(() => {
    if (autoSizeTimeoutRef.current) {
      clearTimeout(autoSizeTimeoutRef.current);
      autoSizeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearAutoSizeTimeout, [clearAutoSizeTimeout]);

  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);
      clearAutoSizeTimeout();

      if (!gridApi || gridApi.isDestroyed()) {
        return;
      }

      autoSizeTimeoutRef.current = setTimeout(() => {
        autoSizeTimeoutRef.current = null;
        if (gridApi.isDestroyed()) {
          return;
        }

        const column = gridApi.getColumn(colId);
        if (column) {
          gridApi.autoSizeColumns([colId]);
        }
      }, 100);
    },
    [clearAutoSizeTimeout, gridApi, toggleDisplayMode]
  );

  return {
    columnDefs,
    columnDisplayModes,
    isReferenceColumn,
    rowData,
    toggleColumnDisplayMode,
  };
};
