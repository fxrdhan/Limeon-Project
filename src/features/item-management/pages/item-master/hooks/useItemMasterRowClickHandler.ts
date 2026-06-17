import { useCallback } from 'react';
import type { Item as ItemDataType } from '@/types/database';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
  Supplier as SupplierType,
} from '@/types';
import type { EntityData } from '@/features/item-management/application/hooks/collections/useEntityManager';
import type { MasterDataType } from '@/features/item-management/shared/types';

type ItemMasterRowData =
  | ItemDataType
  | EntityData
  | SupplierType
  | CustomerType
  | PatientType
  | DoctorType;

interface UseItemMasterRowClickHandlerProps {
  activeTab: MasterDataType;
  handleCustomerEdit: (customer: CustomerType) => void;
  handleDoctorEdit: (doctor: DoctorType) => void;
  handleItemEdit: (item: ItemDataType) => void;
  handlePatientEdit: (patient: PatientType) => void;
  openEditEntityModal: (entity: EntityData) => void;
  openEditSupplierModal: (supplier: SupplierType) => void;
}

const hasEditableName = (data: ItemMasterRowData) =>
  typeof data.id === 'string' && typeof data.name === 'string';

const isItemRow = (data: ItemMasterRowData): data is ItemDataType =>
  'base_price' in data &&
  'sell_price' in data &&
  'stock' in data &&
  typeof data.base_price === 'number' &&
  typeof data.sell_price === 'number' &&
  typeof data.stock === 'number';

const isSupplierTabRow = (data: ItemMasterRowData): data is SupplierType =>
  hasEditableName(data);

const isCustomerTabRow = (data: ItemMasterRowData): data is CustomerType =>
  hasEditableName(data) &&
  'customer_level_id' in data &&
  typeof data.customer_level_id === 'string';

const isPatientTabRow = (data: ItemMasterRowData): data is PatientType =>
  hasEditableName(data);

const isDoctorTabRow = (data: ItemMasterRowData): data is DoctorType =>
  hasEditableName(data);

const isEntityTabRow = (data: ItemMasterRowData): data is EntityData =>
  hasEditableName(data);

export const useItemMasterRowClickHandler = ({
  activeTab,
  handleCustomerEdit,
  handleDoctorEdit,
  handleItemEdit,
  handlePatientEdit,
  openEditEntityModal,
  openEditSupplierModal,
}: UseItemMasterRowClickHandlerProps) =>
  useCallback(
    (data: ItemMasterRowData) => {
      switch (activeTab) {
        case 'items':
          if (isItemRow(data)) {
            handleItemEdit(data);
          }
          break;
        case 'suppliers':
          if (isSupplierTabRow(data)) {
            openEditSupplierModal(data);
          }
          break;
        case 'customers':
          if (isCustomerTabRow(data)) {
            handleCustomerEdit(data);
          }
          break;
        case 'patients':
          if (isPatientTabRow(data)) {
            handlePatientEdit(data);
          }
          break;
        case 'doctors':
          if (isDoctorTabRow(data)) {
            handleDoctorEdit(data);
          }
          break;
        default:
          if (isEntityTabRow(data)) {
            openEditEntityModal(data);
          }
      }
    },
    [
      activeTab,
      handleCustomerEdit,
      handleDoctorEdit,
      handleItemEdit,
      handlePatientEdit,
      openEditEntityModal,
      openEditSupplierModal,
    ]
  );
