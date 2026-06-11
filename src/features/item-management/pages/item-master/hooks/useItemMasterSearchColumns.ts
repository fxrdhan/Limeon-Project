import type { MasterDataType } from '@/features/item-management/shared/types';
import { getOrderedSearchColumnsByEntity } from '@/utils/searchColumns';
import { useMemo } from 'react';
import {
  getItemEntitySearchColumns,
  getOtherMasterDataSearchColumns,
  getSupplierSearchColumns,
} from '../searchColumnConfig';

interface UseItemMasterSearchColumnsParams {
  activeTab: MasterDataType;
  visibleColumns: string[];
  isItemEntityTab: boolean;
  isSupplierTab: boolean;
  isCustomerTab: boolean;
  isPatientTab: boolean;
  isDoctorTab: boolean;
}

export const useItemMasterSearchColumns = ({
  activeTab,
  visibleColumns,
  isItemEntityTab,
  isSupplierTab,
  isCustomerTab,
  isPatientTab,
  isDoctorTab,
}: UseItemMasterSearchColumnsParams) => {
  const orderedSearchColumns = useMemo(() => {
    return getOrderedSearchColumnsByEntity(
      'items',
      visibleColumns.length > 0 ? visibleColumns : undefined
    );
  }, [visibleColumns]);

  const entitySearchColumns = useMemo(() => {
    if (!isItemEntityTab) return [];
    return getItemEntitySearchColumns(activeTab, visibleColumns);
  }, [activeTab, isItemEntityTab, visibleColumns]);

  const supplierSearchColumns = useMemo(() => {
    if (!isSupplierTab) return [];
    return getSupplierSearchColumns(visibleColumns);
  }, [isSupplierTab, visibleColumns]);

  const customerSearchColumns = useMemo(() => {
    if (!isCustomerTab) return [];
    return getOtherMasterDataSearchColumns('customers', visibleColumns);
  }, [isCustomerTab, visibleColumns]);

  const patientSearchColumns = useMemo(() => {
    if (!isPatientTab) return [];
    return getOtherMasterDataSearchColumns('patients', visibleColumns);
  }, [isPatientTab, visibleColumns]);

  const doctorSearchColumns = useMemo(() => {
    if (!isDoctorTab) return [];
    return getOtherMasterDataSearchColumns('doctors', visibleColumns);
  }, [isDoctorTab, visibleColumns]);

  return {
    orderedSearchColumns,
    entitySearchColumns,
    supplierSearchColumns,
    customerSearchColumns,
    patientSearchColumns,
    doctorSearchColumns,
  };
};
