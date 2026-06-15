import type { MasterDataType } from '@/features/item-management/shared/types';
import {
  isItemMasterEntityTab,
  isOtherMasterDataTab,
} from '@/features/item-management/shared/types';
import type { EntityData } from '@/features/item-management/application/hooks/collections/useEntityManager';
import { useUnifiedSearch } from '@/hooks/ag-grid/useUnifiedSearch';
import { buildAdvancedFilterModel } from '@/utils/advancedFilterBuilder';
import type { FilterSearch } from '@/types/search';
import type { Item as ItemDataType } from '@/types/database';
import type {
  Customer as CustomerType,
  Doctor as DoctorType,
  Patient as PatientType,
  Supplier as SupplierType,
} from '@/types';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, type RefObject } from 'react';
import { filterSuppliersForDisplay } from '../supplierDisplay';
import { saveFilterSearchPatternToSession } from '../sessionState';
import { getActiveItemMasterSearchRuntime } from '../itemMasterSearchState';
import { useItemMasterSearchColumns } from './useItemMasterSearchColumns';
import {
  useItemMasterSearchSession,
  useItemMasterSearchSnapshots,
} from './useItemMasterSearchSession';

interface UseItemMasterSearchesParams {
  activeTab: MasterDataType;
  visibleColumns: string[];
  unifiedGridApi: GridApi | null;
  isTabSwitchingRef: RefObject<boolean>;
  itemsData: ItemDataType[];
  setItemsSearch: (search: string) => void;
  entityData: EntityData[];
  handleEntitySearch: (search: string) => void;
  suppliersData: SupplierType[];
  customersData: CustomerType[];
  patientsData: PatientType[];
  doctorsData: DoctorType[];
  setCustomerDataSearch: (search: string) => void;
  setPatientDataSearch: (search: string) => void;
  setDoctorDataSearch: (search: string) => void;
}

export const useItemMasterSearches = ({
  activeTab,
  visibleColumns,
  unifiedGridApi,
  isTabSwitchingRef,
  itemsData,
  setItemsSearch,
  entityData,
  handleEntitySearch,
  suppliersData,
  customersData,
  patientsData,
  doctorsData,
  setCustomerDataSearch,
  setPatientDataSearch,
  setDoctorDataSearch,
}: UseItemMasterSearchesParams) => {
  const searchSnapshotsByTabRef = useItemMasterSearchSnapshots();

  const isSupplierTab = activeTab === 'suppliers';
  const isCustomerTab = activeTab === 'customers';
  const isPatientTab = activeTab === 'patients';
  const isDoctorTab = activeTab === 'doctors';
  const isItemEntityTab = isItemMasterEntityTab(activeTab);
  const isOtherMasterTab = isOtherMasterDataTab(activeTab);
  const {
    orderedSearchColumns,
    entitySearchColumns,
    supplierSearchColumns,
    customerSearchColumns,
    patientSearchColumns,
    doctorSearchColumns,
  } = useItemMasterSearchColumns({
    activeTab,
    visibleColumns,
    isItemEntityTab,
    isSupplierTab,
    isCustomerTab,
    isPatientTab,
    isDoctorTab,
  });

  const applyFilterSearch = useCallback(
    (
      tab: MasterDataType,
      filterSearch: FilterSearch | null,
      isEnabled: boolean
    ) => {
      if (isTabSwitchingRef.current && !filterSearch) {
        return;
      }

      if (!isEnabled) {
        return;
      }

      if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
        return;
      }

      unifiedGridApi.setAdvancedFilterModel(
        buildAdvancedFilterModel(filterSearch)
      );

      saveFilterSearchPatternToSession(
        tab,
        filterSearch,
        searchSnapshotsByTabRef.current[tab]
      );
    },
    [isTabSwitchingRef, searchSnapshotsByTabRef, unifiedGridApi]
  );

  const handleItemSearch = useCallback(
    (searchValue: string) => {
      setItemsSearch(searchValue);
    },
    [setItemsSearch]
  );

  const handleItemClear = useCallback(() => {
    setItemsSearch('');
  }, [setItemsSearch]);

  const handleItemFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      applyFilterSearch('items', filterSearch, true);
    },
    [applyFilterSearch]
  );

  const {
    search: itemSearch,
    setSearch: setItemSearch,
    onGridReady: itemOnGridReady,
    isExternalFilterPresent: itemIsExternalFilterPresent,
    doesExternalFilterPass: itemDoesExternalFilterPass,
    searchBarProps: itemSearchBarProps,
    clearSearchUIOnly: clearItemSearchUIOnly,
  } = useUnifiedSearch({
    columns: orderedSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: itemsData,
    onSearch: handleItemSearch,
    onClear: handleItemClear,
    onFilterSearch: handleItemFilterSearch,
  });

  const handleSupplierFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      applyFilterSearch(activeTab, filterSearch, isSupplierTab);
    },
    [activeTab, applyFilterSearch, isSupplierTab]
  );

  const handleEntityFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      applyFilterSearch(activeTab, filterSearch, isItemEntityTab);
    },
    [activeTab, applyFilterSearch, isItemEntityTab]
  );

  const handleMasterDataFilterSearch = useCallback(
    (filterSearch: FilterSearch | null) => {
      applyFilterSearch(activeTab, filterSearch, isOtherMasterTab);
    },
    [activeTab, applyFilterSearch, isOtherMasterTab]
  );

  const clearEntitySearch = useCallback(() => {
    handleEntitySearch('');
  }, [handleEntitySearch]);

  const clearCustomerSearch = useCallback(() => {
    setCustomerDataSearch('');
  }, [setCustomerDataSearch]);

  const clearPatientSearch = useCallback(() => {
    setPatientDataSearch('');
  }, [setPatientDataSearch]);

  const clearDoctorSearch = useCallback(() => {
    setDoctorDataSearch('');
  }, [setDoctorDataSearch]);

  const {
    search: entitySearch,
    setSearch: setEntitySearch,
    onGridReady: entityOnGridReady,
    isExternalFilterPresent: entityIsExternalFilterPresent,
    doesExternalFilterPass: entityDoesExternalFilterPass,
    searchBarProps: entitySearchBarProps,
    clearSearchUIOnly: clearEntitySearchUIOnly,
  } = useUnifiedSearch({
    columns: entitySearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: entityData,
    onSearch: handleEntitySearch,
    onClear: clearEntitySearch,
    onFilterSearch: handleEntityFilterSearch,
  });

  const {
    search: supplierSearch,
    setSearch: setSupplierSearch,
    onGridReady: supplierOnGridReady,
    isExternalFilterPresent: supplierIsExternalFilterPresent,
    doesExternalFilterPass: supplierDoesExternalFilterPass,
    searchBarProps: supplierSearchBarProps,
    clearSearchUIOnly: clearSupplierSearchUIOnly,
  } = useUnifiedSearch({
    columns: supplierSearchColumns,
    searchMode: 'client',
    useFuzzySearch: true,
    data: suppliersData,
    onFilterSearch: handleSupplierFilterSearch,
  });

  const {
    search: customerSearch,
    setSearch: setCustomerSearch,
    onGridReady: customerOnGridReady,
    isExternalFilterPresent: customerIsExternalFilterPresent,
    doesExternalFilterPass: customerDoesExternalFilterPass,
    searchBarProps: customerSearchBarProps,
    clearSearchUIOnly: clearCustomerSearchUIOnly,
  } = useUnifiedSearch({
    columns: customerSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: customersData,
    onSearch: setCustomerDataSearch,
    onClear: clearCustomerSearch,
    onFilterSearch: handleMasterDataFilterSearch,
  });

  const {
    search: patientSearch,
    setSearch: setPatientSearch,
    onGridReady: patientOnGridReady,
    isExternalFilterPresent: patientIsExternalFilterPresent,
    doesExternalFilterPass: patientDoesExternalFilterPass,
    searchBarProps: patientSearchBarProps,
    clearSearchUIOnly: clearPatientSearchUIOnly,
  } = useUnifiedSearch({
    columns: patientSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: patientsData,
    onSearch: setPatientDataSearch,
    onClear: clearPatientSearch,
    onFilterSearch: handleMasterDataFilterSearch,
  });

  const {
    search: doctorSearch,
    setSearch: setDoctorSearch,
    onGridReady: doctorOnGridReady,
    isExternalFilterPresent: doctorIsExternalFilterPresent,
    doesExternalFilterPass: doctorDoesExternalFilterPass,
    searchBarProps: doctorSearchBarProps,
    clearSearchUIOnly: clearDoctorSearchUIOnly,
  } = useUnifiedSearch({
    columns: doctorSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: doctorsData,
    onSearch: setDoctorDataSearch,
    onClear: clearDoctorSearch,
    onFilterSearch: handleMasterDataFilterSearch,
  });

  const suppliersForDisplay = useMemo(
    () => filterSuppliersForDisplay(suppliersData, supplierSearch),
    [supplierSearch, suppliersData]
  );

  const searchRuntimes = useMemo(
    () => ({
      items: {
        pattern: itemSearch,
        columns: orderedSearchColumns,
        clearUiOnly: clearItemSearchUIOnly,
      },
      suppliers: {
        pattern: supplierSearch,
        columns: supplierSearchColumns,
        clearUiOnly: clearSupplierSearchUIOnly,
      },
      customers: {
        pattern: customerSearch,
        columns: customerSearchColumns,
        clearUiOnly: clearCustomerSearchUIOnly,
      },
      patients: {
        pattern: patientSearch,
        columns: patientSearchColumns,
        clearUiOnly: clearPatientSearchUIOnly,
      },
      doctors: {
        pattern: doctorSearch,
        columns: doctorSearchColumns,
        clearUiOnly: clearDoctorSearchUIOnly,
      },
      itemEntity: {
        pattern: entitySearch,
        columns: entitySearchColumns,
        clearUiOnly: clearEntitySearchUIOnly,
      },
    }),
    [
      clearCustomerSearchUIOnly,
      clearDoctorSearchUIOnly,
      clearEntitySearchUIOnly,
      clearItemSearchUIOnly,
      clearPatientSearchUIOnly,
      clearSupplierSearchUIOnly,
      customerSearch,
      customerSearchColumns,
      doctorSearch,
      doctorSearchColumns,
      entitySearch,
      entitySearchColumns,
      itemSearch,
      orderedSearchColumns,
      patientSearch,
      patientSearchColumns,
      supplierSearch,
      supplierSearchColumns,
    ]
  );

  const activeSearchBarProps = getActiveItemMasterSearchRuntime(activeTab, {
    items: itemSearchBarProps,
    suppliers: supplierSearchBarProps,
    customers: customerSearchBarProps,
    patients: patientSearchBarProps,
    doctors: doctorSearchBarProps,
    itemEntity: entitySearchBarProps,
  });

  const activeSearchColumns = activeSearchBarProps.columns;

  const activeSearchValue = getActiveItemMasterSearchRuntime(activeTab, {
    items: itemSearch,
    suppliers: supplierSearch,
    customers: customerSearch,
    patients: patientSearch,
    doctors: doctorSearch,
    itemEntity: entitySearch,
  });

  const searchSetters = useMemo(
    () => ({
      items: setItemSearch,
      suppliers: setSupplierSearch,
      customers: setCustomerSearch,
      patients: setPatientSearch,
      doctors: setDoctorSearch,
      itemEntity: setEntitySearch,
    }),
    [
      setCustomerSearch,
      setDoctorSearch,
      setEntitySearch,
      setItemSearch,
      setPatientSearch,
      setSupplierSearch,
    ]
  );

  useItemMasterSearchSession({
    activeTab,
    activeSearchValue,
    activeSearchColumns,
    unifiedGridApi,
    searchSnapshotsByTabRef,
    searchSetters,
  });

  const handleActiveGridReady = useCallback(
    (params: GridReadyEvent) => {
      getActiveItemMasterSearchRuntime(activeTab, {
        items: itemOnGridReady,
        suppliers: supplierOnGridReady,
        customers: customerOnGridReady,
        patients: patientOnGridReady,
        doctors: doctorOnGridReady,
        itemEntity: entityOnGridReady,
      })(params);
    },
    [
      activeTab,
      customerOnGridReady,
      doctorOnGridReady,
      entityOnGridReady,
      itemOnGridReady,
      patientOnGridReady,
      supplierOnGridReady,
    ]
  );

  useEffect(() => {
    if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
      return;
    }

    handleActiveGridReady({
      api: unifiedGridApi,
    } as GridReadyEvent);
  }, [activeTab, handleActiveGridReady, unifiedGridApi]);

  const activeIsExternalFilterPresent = getActiveItemMasterSearchRuntime(
    activeTab,
    {
      items: itemIsExternalFilterPresent,
      suppliers: supplierIsExternalFilterPresent,
      customers: customerIsExternalFilterPresent,
      patients: patientIsExternalFilterPresent,
      doctors: doctorIsExternalFilterPresent,
      itemEntity: entityIsExternalFilterPresent,
    }
  );

  const activeDoesExternalFilterPass = getActiveItemMasterSearchRuntime(
    activeTab,
    {
      items: itemDoesExternalFilterPass,
      suppliers: supplierDoesExternalFilterPass,
      customers: customerDoesExternalFilterPass,
      patients: patientDoesExternalFilterPass,
      doctors: doctorDoesExternalFilterPass,
      itemEntity: entityDoesExternalFilterPass,
    }
  );

  return {
    activeSearchBarProps,
    activeSearchValue,
    activeIsExternalFilterPresent,
    activeDoesExternalFilterPass,
    handleActiveGridReady,
    supplierSearch,
    suppliersForDisplay,
    searchRuntimes,
  };
};
