import type {
  DefaultMenuItem,
  GetMainMenuItems,
  MenuItemDef,
} from 'ag-grid-community';
import { useCallback } from 'react';
import { getPinAndFilterMenuItems } from '@/components/ag-grid/columns';
import type { ColumnDisplayMode } from '@/features/item-management/application/hooks/ui/useColumnDisplayMode';
import type { MasterDataType } from '@/features/item-management/shared/types';

interface UseEntityGridMenuItemsParams {
  activeTab: MasterDataType;
  columnDisplayModes: Record<string, ColumnDisplayMode>;
  isReferenceColumn: (colId: string) => boolean;
  toggleColumnDisplayMode: (colId: string) => void;
}

export const useEntityGridMenuItems = ({
  activeTab,
  columnDisplayModes,
  isReferenceColumn,
  toggleColumnDisplayMode,
}: UseEntityGridMenuItemsParams) => {
  return useCallback<GetMainMenuItems>(
    params => {
      if (!params.column) {
        return getPinAndFilterMenuItems(params);
      }

      const colId = params.column.getColId();
      const colDef = params.column.getColDef();

      const baseMenuItems: DefaultMenuItem[] = [
        'sortAscending',
        'sortDescending',
        'separator',
        'pinSubMenu',
      ];

      const menuWithGroupBy: DefaultMenuItem[] = colDef.enableRowGroup
        ? [...baseMenuItems, 'separator', 'rowGroup']
        : baseMenuItems;
      const finalMenuItems: DefaultMenuItem[] = [
        ...menuWithGroupBy,
        'separator',
        'autoSizeAll',
      ];

      if (activeTab === 'items' && isReferenceColumn(colId)) {
        const currentMode = columnDisplayModes[colId];
        const nextMode = currentMode === 'name' ? 'code' : 'nama';
        const toggleMenuItem: MenuItemDef = {
          name: `Tampilkan ${nextMode}`,
          action: () => {
            toggleColumnDisplayMode(colId);
          },
          icon: currentMode === 'name' ? '#' : 'T',
        };

        return [...finalMenuItems, 'separator', toggleMenuItem];
      }

      return finalMenuItems;
    },
    [activeTab, columnDisplayModes, isReferenceColumn, toggleColumnDisplayMode]
  );
};
