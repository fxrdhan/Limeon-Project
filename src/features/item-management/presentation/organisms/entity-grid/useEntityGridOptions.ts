import type { GridState } from 'ag-grid-community';
import { useMemo } from 'react';
import type { MasterDataType } from '@/features/item-management/shared/types';
import type { TableType } from '@/utils/gridStateManager';
import { getEntityGridOverlayNoRowsTemplate } from './overlay';
import type { EntityGridEntityConfig } from './types';

interface UseEntityGridOptionsParams {
  activeTab: MasterDataType;
  entityConfig?: EntityGridEntityConfig | null;
  hasSavedGridState: (tableType: TableType) => boolean;
  isRowGroupingEnabled: boolean;
  readSavedGridState: (tableType: TableType) => GridState | undefined;
  search: string;
}

export const useEntityGridOptions = ({
  activeTab,
  entityConfig,
  hasSavedGridState,
  isRowGroupingEnabled,
  readSavedGridState,
  search,
}: UseEntityGridOptionsParams) => {
  const autoGroupColumnDef = useMemo(() => {
    if (!isRowGroupingEnabled || activeTab !== 'items') {
      return undefined;
    }

    return {
      headerName: 'Grup',
      cellRenderer: 'agGroupCellRenderer',
      cellRendererParams: {
        suppressCount: false,
        suppressDoubleClickExpand: false,
      },
      sortable: true,
      resizable: true,
      pinned: 'left' as const,
      lockPinned: true,
    };
  }, [activeTab, isRowGroupingEnabled]);

  const sideBarConfig = useMemo(() => {
    const tableType = activeTab as TableType;
    const savedState = hasSavedGridState(tableType)
      ? readSavedGridState(tableType)
      : null;

    let defaultToolPanel: string | undefined;
    if (savedState) {
      const sideBarState = savedState.sideBar as
        | {
            visible?: boolean;
            openToolPanel?: string;
            openToolPanelId?: string;
          }
        | undefined;
      const openToolPanel =
        sideBarState?.openToolPanel || sideBarState?.openToolPanelId;

      if (sideBarState?.visible && openToolPanel) {
        defaultToolPanel = openToolPanel;
      }
    }

    return {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
          },
        },
      ],
      defaultToolPanel,
    };
  }, [activeTab, hasSavedGridState, readSavedGridState]);

  const overlayNoRowsTemplate = useMemo(() => {
    return getEntityGridOverlayNoRowsTemplate({
      activeTab,
      entityConfig,
      search,
    });
  }, [activeTab, entityConfig, search]);

  return {
    autoGroupColumnDef,
    overlayNoRowsTemplate,
    sideBarConfig,
  };
};
