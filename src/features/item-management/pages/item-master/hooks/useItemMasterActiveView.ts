import type { MasterDataType } from '@/features/item-management/shared/types';
import { useCallback, useMemo, type KeyboardEvent } from 'react';
import {
  getItemMasterActiveAddTooltipLabel,
  getItemMasterActiveExportFilename,
  getItemMasterActiveExportTooltipLabel,
  getItemMasterActiveItemsPerPage,
  getItemMasterActivePlaceholder,
  getItemMasterActiveStatus,
  getItemMasterColumnDefs,
  getItemMasterDataConfig,
  getItemMasterRows,
  type ItemMasterActiveViewColumns,
  type ItemMasterActiveViewConfig,
  type ItemMasterActiveViewData,
  type ItemMasterActiveViewFlags,
  type ItemMasterActiveViewPagination,
  type ItemMasterActiveViewStatusMap,
} from '../itemMasterActiveViewState';
import {
  getItemMasterActiveItemSelection,
  getItemMasterActiveKeyDownHandler,
  runItemMasterActiveAddAction,
} from '../itemMasterActiveViewInteractions';

interface UseItemMasterActiveViewParams {
  activeTab: MasterDataType;
  flags: ItemMasterActiveViewFlags;
  config: ItemMasterActiveViewConfig;
  data: ItemMasterActiveViewData;
  columns: ItemMasterActiveViewColumns;
  pagination: ItemMasterActiveViewPagination;
  status: ItemMasterActiveViewStatusMap;
  toolbar: {
    activeSearchValue: string;
    handleAddItem: (itemId?: string, searchQuery?: string) => void;
    openAddSupplierModal: () => void;
    openAddEntityModal: () => void;
    openAddCustomerModal: () => void;
    openAddPatientModal: () => void;
    openAddDoctorModal: () => void;
    handleCustomerKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handlePatientKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handleDoctorKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    handleItemSelect: (item: { id: string }) => void;
  };
}

export const useItemMasterActiveView = ({
  activeTab,
  flags,
  config,
  data,
  columns,
  pagination,
  status,
  toolbar,
}: UseItemMasterActiveViewParams) => {
  const {
    isCustomerTab,
    isDoctorTab,
    isItemEntityTab,
    isItemTab,
    isOtherMasterTab,
    isPatientTab,
    isSupplierTab,
  } = flags;
  const { entityCurrentConfig, otherMasterDataConfig } = config;
  const { customers, doctors, entityRows, itemsData, patients } = data;
  const {
    customerColumnDefs,
    doctorColumnDefs,
    entityColumnDefs,
    patientColumnDefs,
  } = columns;
  const {
    customerItemsPerPage,
    doctorItemsPerPage,
    entityItemsPerPage,
    itemItemsPerPage,
    patientItemsPerPage,
  } = pagination;

  const masterDataRows = useMemo(
    () =>
      getItemMasterRows(
        { isCustomerTab, isDoctorTab, isItemEntityTab, isPatientTab },
        { customers, doctors, entityRows, itemsData, patients }
      ),
    [
      customers,
      doctors,
      entityRows,
      itemsData,
      patients,
      isCustomerTab,
      isDoctorTab,
      isItemEntityTab,
      isPatientTab,
    ]
  );

  const masterDataColumnDefs = useMemo(
    () =>
      getItemMasterColumnDefs(
        { isCustomerTab, isDoctorTab, isItemEntityTab, isPatientTab },
        {
          customerColumnDefs,
          doctorColumnDefs,
          entityColumnDefs,
          patientColumnDefs,
        }
      ),
    [
      customerColumnDefs,
      doctorColumnDefs,
      entityColumnDefs,
      patientColumnDefs,
      isCustomerTab,
      isDoctorTab,
      isItemEntityTab,
      isPatientTab,
    ]
  );

  const masterDataConfig = useMemo(() => {
    return getItemMasterDataConfig(
      { isItemEntityTab },
      { entityCurrentConfig, otherMasterDataConfig }
    );
  }, [entityCurrentConfig, isItemEntityTab, otherMasterDataConfig]);

  const activeItemsPerPage = getItemMasterActiveItemsPerPage(
    {
      isCustomerTab,
      isDoctorTab,
      isItemEntityTab,
      isItemTab,
      isPatientTab,
      isSupplierTab,
    },
    {
      customerItemsPerPage,
      doctorItemsPerPage,
      entityItemsPerPage,
      itemItemsPerPage,
      patientItemsPerPage,
    }
  );

  const activePlaceholder = getItemMasterActivePlaceholder(
    { isItemTab, isSupplierTab },
    { entityCurrentConfig, otherMasterDataConfig }
  );
  const {
    activeSearchValue,
    handleAddItem,
    handleCustomerKeyDown,
    handleDoctorKeyDown,
    handleItemSelect,
    handlePatientKeyDown,
    openAddCustomerModal,
    openAddDoctorModal,
    openAddEntityModal,
    openAddPatientModal,
    openAddSupplierModal,
  } = toolbar;

  const activeOnAdd = useCallback(() => {
    runItemMasterActiveAddAction(
      {
        isCustomerTab,
        isDoctorTab,
        isItemTab,
        isPatientTab,
        isSupplierTab,
      },
      {
        activeSearchValue,
        handleAddItem,
        openAddCustomerModal,
        openAddDoctorModal,
        openAddEntityModal,
        openAddPatientModal,
        openAddSupplierModal,
      }
    );
  }, [
    activeSearchValue,
    handleAddItem,
    isCustomerTab,
    isDoctorTab,
    isItemTab,
    isPatientTab,
    isSupplierTab,
    openAddCustomerModal,
    openAddDoctorModal,
    openAddEntityModal,
    openAddPatientModal,
    openAddSupplierModal,
  ]);

  const activeOnKeyDown = getItemMasterActiveKeyDownHandler(
    { isCustomerTab, isDoctorTab, isPatientTab },
    { handleCustomerKeyDown, handleDoctorKeyDown, handlePatientKeyDown }
  );

  const activeAddTooltipLabel = getItemMasterActiveAddTooltipLabel(
    { isItemTab, isOtherMasterTab, isSupplierTab },
    { entityCurrentConfig, otherMasterDataConfig }
  );
  const activeExportTooltipLabel = getItemMasterActiveExportTooltipLabel(
    { isItemTab, isOtherMasterTab, isSupplierTab },
    { entityCurrentConfig, otherMasterDataConfig }
  );
  const activeExportFilename = getItemMasterActiveExportFilename(
    activeTab,
    { isItemTab, isOtherMasterTab, isSupplierTab },
    { entityCurrentConfig, otherMasterDataConfig }
  );
  const activeStatus = getItemMasterActiveStatus(
    {
      isCustomerTab,
      isDoctorTab,
      isItemTab,
      isPatientTab,
      isSupplierTab,
    },
    status
  );

  const { activeItemsSelection, activeOnItemSelect } =
    getItemMasterActiveItemSelection(
      { isItemTab },
      { handleItemSelect, itemsData }
    );

  return {
    masterDataRows,
    masterDataColumnDefs,
    masterDataConfig,
    activeItemsPerPage,
    activePlaceholder,
    activeOnAdd,
    activeOnKeyDown,
    activeAddTooltipLabel,
    activeExportTooltipLabel,
    activeExportFilename,
    activeIsLoading: activeStatus.isLoading,
    activeIsError: activeStatus.isError,
    activeError: activeStatus.error,
    activeItemsSelection,
    activeOnItemSelect,
  };
};
