import type {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
  IRowNode,
} from 'ag-grid-community';
import type { MasterDataType } from '@/features/item-management/shared/types';
import type {
  Customer,
  Doctor,
  Item,
  Patient,
  Supplier,
} from '@/types/database';
import type { EntityData } from '../../../application/hooks/collections/useEntityManager';

export type EntityWithCode = {
  name: string;
  code?: string | null;
};

export interface ItemWithExtendedEntities extends Omit<
  Item,
  'category' | 'type' | 'package' | 'dosage' | 'manufacturer'
> {
  category?: EntityWithCode;
  type?: EntityWithCode;
  package?: EntityWithCode;
  dosage?: EntityWithCode;
  manufacturer?: EntityWithCode;
}

export type EntityGridRow =
  | ItemWithExtendedEntities
  | EntityData
  | Supplier
  | Customer
  | Patient
  | Doctor;

export type EntityGridColumnDef = ColDef | ColGroupDef;

export interface EntityGridEntityConfig {
  entityName: string;
  nameColumnHeader: string;
  hasAddress?: boolean;
  hasNciCode?: boolean;
  searchPlaceholder?: string;
  noDataMessage?: string;
  searchNoDataMessage?: string;
}

export interface EntityGridProps {
  activeTab: MasterDataType;

  itemsData?: Item[];
  suppliersData?: Supplier[];
  entityData?: (EntityData | Customer | Patient | Doctor)[];

  isLoading: boolean;
  isError: boolean;
  error: unknown;
  search: string;

  itemColumnDefs?: EntityGridColumnDef[];
  supplierColumnDefs?: EntityGridColumnDef[];
  isRowGroupingEnabled?: boolean;
  defaultExpanded?: number;
  showGroupPanel?: boolean;

  entityConfig?: EntityGridEntityConfig | null;
  entityColumnDefs?: EntityGridColumnDef[];

  onRowClick: (data: EntityGridRow) => void;
  onGridReady: (params: GridReadyEvent<EntityGridRow>) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode<EntityGridRow>) => boolean;
  onGridApiReady?: (api: GridApi | null) => void;
  onFilterChanged?: (
    filterModel: import('ag-grid-community').FilterModel
  ) => void;

  itemsPerPage?: number;
  hideFloatingPagination?: boolean;
}
