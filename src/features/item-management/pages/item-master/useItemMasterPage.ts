import { useMemo, type RefObject } from 'react';
import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { useItemsManagement } from '@/features/item-management/application/hooks/data/useItemsManagement';
import { useItemsSync } from '@/features/item-management/public/useItemData';
import { useItemMasterEntityResources } from './hooks/useItemMasterEntityResources';
import { useIdentityMasterDataTabs } from './hooks/useIdentityMasterDataTabs';
import { useItemMasterActiveView } from './hooks/useItemMasterActiveView';
import { useItemMasterItemActions } from './hooks/useItemMasterItemActions';
import { useItemMasterItemsGridSync } from './hooks/useItemMasterItemsGridSync';
import { useItemMasterRouting } from './hooks/useItemMasterRouting';
import { useItemMasterRowClickHandler } from './hooks/useItemMasterRowClickHandler';
import { useItemMasterSearches } from './hooks/useItemMasterSearches';
import { useItemMasterTabNavigation } from './hooks/useItemMasterTabNavigation';
import { useItemMasterTabSelectorState } from './hooks/useItemMasterTabSelectorState';
import { useItemModalState } from './hooks/useItemModalState';
import { useSupplierTab } from './hooks/useSupplierTab';
import { useVisibleGridColumns } from './hooks/useVisibleGridColumns';
import {
  getItemMasterCoordinatedSearchBarProps,
  getIsAnyMasterDataModalOpen,
  getItemMasterGridGroupingState,
  getItemMasterOtherMasterDataConfig,
  getItemMasterPageTitle,
  getItemMasterTabInteractionState,
  getItemMasterTabFlags,
  getItemMasterTabSelectorLayerClass,
} from './itemMasterPageState';

export const useItemMasterPage = () => {
  const { activeTab, navigate } = useItemMasterRouting();
  const { openConfirmDialog } = useConfirmDialog();

  const tabFlags = getItemMasterTabFlags(activeTab);
  const {
    isItemTab,
    isSupplierTab,
    isCustomerTab,
    isPatientTab,
    isDoctorTab,
    isItemEntityTab,
    isOtherMasterTab,
  } = tabFlags;
  const otherMasterDataConfig = getItemMasterOtherMasterDataConfig(activeTab);

  const {
    searchInputRef,
    tabSelectorContainerRef,
    isTabSwitchingRef,
    isTabSelectorExpanded,
    tabSelectorCollapseSignal,
    handleTabSelectorExpandedChange,
    handleSearchSelectorOpenChange,
  } = useItemMasterTabSelectorState();

  const {
    gridApi: unifiedGridApi,
    visibleColumns,
    handleGridApiReady: handleUnifiedGridApiReady,
    resetVisibleColumns,
  } = useVisibleGridColumns();

  useItemsSync({ enabled: true });

  const supplierTab = useSupplierTab({ enabled: isSupplierTab });
  const {
    suppliersQuery,
    supplierColumnDefs,
    suppliersData,
    isAddSupplierModalOpen,
    isEditSupplierModalOpen,
    openAddSupplierModal,
    openEditSupplierModal,
  } = supplierTab;

  const identityTabs = useIdentityMasterDataTabs({
    isCustomerTab,
    isDoctorTab,
    isPatientTab,
  });
  const {
    customerColumnDefs,
    customerItemsPerPage,
    customersDataTyped,
    customersQueryError,
    doctorColumnDefs,
    doctorItemsPerPage,
    doctorsDataTyped,
    doctorsQueryError,
    handleCustomerEdit,
    handleCustomerKeyDown,
    handleDoctorEdit,
    handleDoctorKeyDown,
    handlePatientEdit,
    handlePatientKeyDown,
    isAddCustomerModalOpen,
    isAddDoctorModalOpen,
    isAddPatientModalOpen,
    isCustomersError,
    isCustomersLoading,
    isDoctorsError,
    isDoctorsLoading,
    isEditCustomerModalOpen,
    isEditDoctorModalOpen,
    isEditPatientModalOpen,
    isPatientsError,
    isPatientsLoading,
    patientColumnDefs,
    patientItemsPerPage,
    patientsDataTyped,
    patientsQueryError,
    setCustomerDataSearch,
    setDoctorDataSearch,
    setIsAddCustomerModalOpen,
    setIsAddDoctorModalOpen,
    setIsAddPatientModalOpen,
    setIsEditCustomerModalOpen,
    setIsEditDoctorModalOpen,
    setIsEditPatientModalOpen,
    setPatientDataSearch,
  } = identityTabs;

  const itemModalState = useItemModalState();
  const {
    isOpen: isAddItemModalOpen,
    isClosing: isItemModalClosing,
    open: openAddItemModal,
    close: closeAddItemModal,
  } = itemModalState;

  const itemsManagement = useItemsManagement({
    enabled: true,
  });
  const itemsData = itemsManagement.data;
  const allItemsData = itemsManagement.allData;

  const {
    entityManager,
    entityData,
    itemColumnDefs,
    entityCurrentConfig,
    entityColumnDefs,
  } = useItemMasterEntityResources({
    activeTab,
    isAddItemModalOpen,
    isItemEntityTab,
    searchInputRef: searchInputRef as RefObject<HTMLInputElement>,
  });

  const { handleAddItem, handleItemEdit, handleItemSelect } =
    useItemMasterItemActions({
      itemsData: allItemsData,
      openAddItemModal,
    });

  const {
    activeSearchBarProps,
    activeSearchValue,
    activeIsExternalFilterPresent,
    activeDoesExternalFilterPass,
    handleActiveGridReady,
    supplierSearch,
    suppliersForDisplay,
    searchRuntimes,
  } = useItemMasterSearches({
    activeTab,
    visibleColumns,
    unifiedGridApi,
    isTabSwitchingRef,
    itemsData,
    setItemsSearch: itemsManagement.setSearch,
    entityData: entityData.data,
    handleEntitySearch: entityManager.handleSearch,
    suppliersData,
    customersData: customersDataTyped,
    patientsData: patientsDataTyped,
    doctorsData: doctorsDataTyped,
    setCustomerDataSearch,
    setPatientDataSearch,
    setDoctorDataSearch,
  });

  const {
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
    activeIsLoading,
    activeIsError,
    activeError,
    activeItemsSelection,
    activeOnItemSelect,
  } = useItemMasterActiveView({
    activeTab,
    flags: {
      isItemTab,
      isSupplierTab,
      isCustomerTab,
      isPatientTab,
      isDoctorTab,
      isItemEntityTab,
      isOtherMasterTab,
    },
    config: {
      entityCurrentConfig,
      otherMasterDataConfig,
    },
    data: {
      itemsData,
      entityRows: entityData.data,
      customers: customersDataTyped,
      patients: patientsDataTyped,
      doctors: doctorsDataTyped,
    },
    columns: {
      entityColumnDefs,
      customerColumnDefs,
      patientColumnDefs,
      doctorColumnDefs,
    },
    pagination: {
      itemItemsPerPage: itemsManagement.itemsPerPage,
      entityItemsPerPage: entityManager.itemsPerPage,
      customerItemsPerPage,
      patientItemsPerPage,
      doctorItemsPerPage,
    },
    status: {
      items: {
        isLoading: itemsManagement.isLoading,
        isError: itemsManagement.isError,
        error: itemsManagement.queryError,
      },
      suppliers: {
        isLoading: suppliersQuery.isLoading,
        isError: suppliersQuery.isError,
        error: suppliersQuery.error,
      },
      customers: {
        isLoading: isCustomersLoading,
        isError: isCustomersError,
        error: customersQueryError,
      },
      patients: {
        isLoading: isPatientsLoading,
        isError: isPatientsError,
        error: patientsQueryError,
      },
      doctors: {
        isLoading: isDoctorsLoading,
        isError: isDoctorsError,
        error: doctorsQueryError,
      },
      entity: {
        isLoading: entityData.isLoading,
        isError: entityData.isError,
        error: entityData.error,
      },
    },
    toolbar: {
      activeSearchValue,
      handleAddItem,
      openAddSupplierModal,
      openAddEntityModal: entityManager.openAddModal,
      openAddCustomerModal: () => setIsAddCustomerModalOpen(true),
      openAddPatientModal: () => setIsAddPatientModalOpen(true),
      openAddDoctorModal: () => setIsAddDoctorModalOpen(true),
      handleCustomerKeyDown,
      handlePatientKeyDown,
      handleDoctorKeyDown,
      handleItemSelect,
    },
  });

  const { handleTabChange, handleTabNext, handleTabPrevious } =
    useItemMasterTabNavigation({
      activeTab,
      navigate,
      isTabSwitchingRef,
      resetVisibleColumns,
      searchRuntimes,
      modalState: {
        isAddItemModalOpen,
        closeAddItemModal,
        isAddCustomerModalOpen,
        setIsAddCustomerModalOpen,
        isEditCustomerModalOpen,
        setIsEditCustomerModalOpen,
        isAddPatientModalOpen,
        setIsAddPatientModalOpen,
        isEditPatientModalOpen,
        setIsEditPatientModalOpen,
        isAddDoctorModalOpen,
        setIsAddDoctorModalOpen,
        isEditDoctorModalOpen,
        setIsEditDoctorModalOpen,
      },
    });

  const unifiedRowClickHandler = useItemMasterRowClickHandler({
    activeTab,
    handleCustomerEdit,
    handleDoctorEdit,
    handleItemEdit,
    handlePatientEdit,
    openEditEntityModal: entityManager.openEditModal,
    openEditSupplierModal,
  });

  const { showTabSelector, enableTabShortcuts } =
    getItemMasterTabInteractionState(tabFlags.isItemMasterTab);
  const pageTitle = getItemMasterPageTitle(
    activeTab,
    otherMasterDataConfig?.title
  );

  const coordinatedSearchBarProps = useMemo(
    () =>
      getItemMasterCoordinatedSearchBarProps(activeSearchBarProps, {
        onSelectorOpenChange: handleSearchSelectorOpenChange,
        suppressSelectors: isTabSelectorExpanded,
        selectorOutsideIgnoreRefs: [tabSelectorContainerRef],
      }),
    [
      activeSearchBarProps,
      handleSearchSelectorOpenChange,
      isTabSelectorExpanded,
      tabSelectorContainerRef,
    ]
  );

  const isAnyMasterDataModalOpen = getIsAnyMasterDataModalOpen({
    isAddItemModalOpen,
    isItemModalClosing,
    isEntityAddModalOpen: entityManager.isAddModalOpen,
    isEntityEditModalOpen: entityManager.isEditModalOpen,
    isAddSupplierModalOpen,
    isEditSupplierModalOpen,
    isAddCustomerModalOpen,
    isEditCustomerModalOpen,
    isAddPatientModalOpen,
    isEditPatientModalOpen,
    isAddDoctorModalOpen,
    isEditDoctorModalOpen,
  });
  const tabSelectorLayerClass = getItemMasterTabSelectorLayerClass(
    isAnyMasterDataModalOpen
  );
  const gridGroupingState = getItemMasterGridGroupingState(activeTab);

  useItemMasterItemsGridSync({
    gridApi: unifiedGridApi,
    isAddItemModalOpen,
    isItemModalClosing,
    isItemTab,
    isLoading: activeIsLoading,
    itemsData,
  });

  return {
    headerProps: {
      activeTab,
      pageTitle,
      showTabSelector,
      tabSelectorContainerRef,
      tabSelectorLayerClass,
      tabSelectorCollapseSignal,
      onTabChange: handleTabChange,
      onTabSelectorExpandedChange: handleTabSelectorExpandedChange,
    },
    searchToolbarProps: {
      searchScopeKey: activeTab,
      searchInputRef: searchInputRef as RefObject<HTMLInputElement>,
      searchBarProps: coordinatedSearchBarProps,
      search: activeSearchValue,
      placeholder: activePlaceholder,
      onAdd: activeOnAdd,
      addTooltipLabel: activeAddTooltipLabel,
      onKeyDown: activeOnKeyDown,
      items: activeItemsSelection,
      onItemSelect: activeOnItemSelect,
      gridApi: unifiedGridApi,
      exportFilename: activeExportFilename,
      exportTooltipLabel: activeExportTooltipLabel,
      onTabNext: enableTabShortcuts ? handleTabNext : undefined,
      onTabPrevious: enableTabShortcuts ? handleTabPrevious : undefined,
    },
    gridSectionProps: {
      activeTab,
      itemsData,
      suppliersData: suppliersForDisplay,
      entityData: masterDataRows,
      isLoading: activeIsLoading,
      isError: activeIsError,
      error: activeError,
      search: activeSearchValue,
      itemColumnDefs,
      entityConfig: masterDataConfig,
      entityColumnDefs: masterDataColumnDefs,
      supplierColumnDefs,
      onRowClick: unifiedRowClickHandler,
      onGridReady: handleActiveGridReady,
      isExternalFilterPresent: activeIsExternalFilterPresent,
      doesExternalFilterPass: activeDoesExternalFilterPass,
      onGridApiReady: handleUnifiedGridApiReady,
      itemsPerPage: activeItemsPerPage,
      hideFloatingPagination: isAnyMasterDataModalOpen,
      isRowGroupingEnabled: gridGroupingState.isRowGroupingEnabled,
      defaultExpanded: gridGroupingState.defaultExpanded,
      showGroupPanel: gridGroupingState.showGroupPanel,
    },
    modalStackProps: {
      activeTab,
      entityCurrentConfig,
      entityManager,
      identityTabs,
      isCustomerTab,
      isDoctorTab,
      isItemEntityTab,
      isPatientTab,
      isSupplierTab,
      itemModalState,
      itemsManagement,
      openConfirmDialog,
      supplierSearch,
      supplierTab,
    },
  };
};
