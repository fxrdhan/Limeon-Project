import { useCallback } from 'react';
import type { Item as ItemDataType } from '@/types/database';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
  Supplier as SupplierType,
} from '@/types';
import type { EntityData } from '@/features/item-management/application/hooks/collections/useEntityManager';

type ItemMasterRowData =
  | ItemDataType
  | EntityData
  | SupplierType
  | CustomerType
  | PatientType
  | DoctorType;

interface UseItemMasterRowClickHandlerProps {
  activeTab: string;
  handleCustomerEdit: (customer: CustomerType) => void;
  handleDoctorEdit: (doctor: DoctorType) => void;
  handleItemEdit: (item: ItemDataType) => void;
  handlePatientEdit: (patient: PatientType) => void;
  openEditEntityModal: (entity: EntityData) => void;
  openEditSupplierModal: (supplier: SupplierType) => void;
}

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
      if (activeTab === 'items') {
        handleItemEdit(data as ItemDataType);
      } else if (activeTab === 'suppliers') {
        openEditSupplierModal(data as SupplierType);
      } else if (activeTab === 'customers') {
        handleCustomerEdit(data as CustomerType);
      } else if (activeTab === 'patients') {
        handlePatientEdit(data as PatientType);
      } else if (activeTab === 'doctors') {
        handleDoctorEdit(data as DoctorType);
      } else {
        openEditEntityModal(data as EntityData);
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
