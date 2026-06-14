import type { GridApi } from 'ag-grid-community';
import { useCallback, useMemo } from 'react';
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
import type {
  EntityGridColumnDef,
  EntityGridRow,
  ItemWithExtendedEntities,
} from './types';

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
  const {
    displayModeState: columnDisplayModes,
    isReferenceColumn,
    toggleColumnDisplayMode: toggleDisplayMode,
  } = useColumnDisplayMode();

  const itemsForDisplay = useItemsDisplayTransform<ItemWithExtendedEntities>(
    itemsData as ItemWithExtendedEntities[] | undefined,
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

  const toggleColumnDisplayMode = useCallback(
    (colId: string) => {
      toggleDisplayMode(colId);

      if (!gridApi || gridApi.isDestroyed()) {
        return;
      }

      setTimeout(() => {
        if (gridApi.isDestroyed()) {
          return;
        }

        const column = gridApi.getColumn(colId);
        if (column) {
          gridApi.autoSizeColumns([colId]);
        }
      }, 100);
    },
    [gridApi, toggleDisplayMode]
  );

  return {
    columnDefs,
    columnDisplayModes,
    isReferenceColumn,
    rowData,
    toggleColumnDisplayMode,
  };
};
