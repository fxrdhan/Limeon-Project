import { memo, useMemo, useState } from 'react';

import EntityGrid from '@/features/item-management/presentation/organisms/EntityGrid';
import SearchToolbar from '@/components/SearchToolbar';

// Simple realtime for all item master data
import { useItemsSync } from '@/hooks/realtime/useItemsSync';

// Hooks and utilities
import { useItemGridColumns } from '@/features/item-management/application/hooks/ui';
import { useItemsManagement } from '@/hooks/data/useItemsManagement';
import { useConfirmDialog } from '@/components/dialog-box';
import { useSupplierTab } from './hooks/useSupplierTab';
import { ItemMasterHeader } from './components/ItemMasterHeader';
import { ItemMasterModalStack } from './components/ItemMasterModalStack';
import {
  isItemMasterEntityTab,
  isItemMasterTab,
  isOtherMasterDataTab,
} from '@/features/item-management/shared/types';
import { OTHER_MASTER_DATA_CONFIG } from './config';

// Entity management hooks
import {
  useEntity,
  useEntityManager,
} from '@/features/item-management/application/hooks/collections';

// Types
import { EntityType } from '@/features/item-management/application/hooks/collections/useEntityManager';
import type { Item as ItemDataType } from '@/types/database';

import { buildEntityColumnDefs } from './entityColumnDefs';
import { useIdentityMasterDataTabs } from './hooks/useIdentityMasterDataTabs';
import { useItemMasterActiveView } from './hooks/useItemMasterActiveView';
import { useItemMasterItemActions } from './hooks/useItemMasterItemActions';
import { useItemMasterItemsGridSync } from './hooks/useItemMasterItemsGridSync';
import { useItemMasterSearches } from './hooks/useItemMasterSearches';
import { useItemMasterRouting } from './hooks/useItemMasterRouting';
import { useItemMasterRowClickHandler } from './hooks/useItemMasterRowClickHandler';
import { useItemMasterTabSelectorState } from './hooks/useItemMasterTabSelectorState';
import { useItemMasterTabNavigation } from './hooks/useItemMasterTabNavigation';
import { useItemModalState } from './hooks/useItemModalState';
import { useVisibleGridColumns } from './hooks/useVisibleGridColumns';

const ItemMasterNew = memo(() => {
  const { activeTab, navigate } = useItemMasterRouting();
  const { openConfirmDialog } = useConfirmDialog();

  const isItemTab = activeTab === 'items';
  const isSupplierTab = activeTab === 'suppliers';
  const isCustomerTab = activeTab === 'customers';
  const isPatientTab = activeTab === 'patients';
  const isDoctorTab = activeTab === 'doctors';
  const isItemEntityTab = isItemMasterEntityTab(activeTab);
  const isOtherMasterTab = isOtherMasterDataTab(activeTab);
  const otherMasterDataConfig = isOtherMasterTab
    ? OTHER_MASTER_DATA_CONFIG[activeTab]
    : null;

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

  // ✅ REALTIME WORKING! Use postgres_changes approach
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

  // Enhanced row grouping state with multi-grouping support (client-side only, no persistence)
  const [isRowGroupingEnabled] = useState(true);
  const showGroupPanel = true;
  const defaultExpanded = -1; // -1 means expand all groups by default

  // No event handling needed for simple client-side row grouping

  // Clean and simple - no persistence logic needed

  // Simple client-side row grouping - no complex state management needed

  // Items tab management (only for items tab)
  const itemsManagement = useItemsManagement({
    enabled: true,
  });

  // Entity management (for entity tabs)
  const entityManager = useEntityManager({
    activeEntityType: isItemEntityTab
      ? (activeTab as EntityType)
      : 'categories',
    searchInputRef: searchInputRef as React.RefObject<HTMLInputElement>,
  });

  // Memoize entity options to prevent unnecessary re-renders
  const entityManagementOptions = useMemo(
    () => ({
      entityType: isItemEntityTab ? (activeTab as EntityType) : 'categories',
      search: entityManager.search,
      itemsPerPage: entityManager.itemsPerPage,
      enabled: isItemEntityTab,
    }),
    [
      activeTab,
      entityManager.search,
      entityManager.itemsPerPage,
      isItemEntityTab,
    ]
  );

  // Generic entity data management
  const entityData = useEntity(entityManagementOptions);

  // Preload item_units data in background for better caching
  useEntity({
    entityType: 'units',
    enabled: activeTab === 'units' || isAddItemModalOpen,
  });

  const { columnDefs: itemColumnDefs } = useItemGridColumns();

  // Entity column visibility management
  const entityCurrentConfig = useMemo(
    () =>
      isItemEntityTab
        ? entityManager.entityConfigs[activeTab as EntityType]
        : null,
    [activeTab, entityManager.entityConfigs, isItemEntityTab]
  );

  const entityColumnDefs = useMemo(
    () =>
      isItemEntityTab
        ? buildEntityColumnDefs(activeTab, entityCurrentConfig)
        : [],
    [activeTab, entityCurrentConfig, isItemEntityTab]
  );

  const { handleAddItem, handleItemEdit, handleItemSelect } =
    useItemMasterItemActions({
      itemsData: itemsManagement.allData as ItemDataType[],
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
    itemsData: itemsManagement.data as ItemDataType[],
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
      itemsData: itemsManagement.data as ItemDataType[],
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

  const showTabSelector = isItemMasterTab(activeTab);
  const pageTitle =
    activeTab === 'suppliers'
      ? 'Daftar Supplier'
      : (otherMasterDataConfig?.title ?? 'Item Master');

  const coordinatedSearchBarProps = useMemo(
    () => ({
      ...activeSearchBarProps,
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

  const enableTabShortcuts = isItemMasterTab(activeTab);
  const isAnyMasterDataModalOpen =
    isAddItemModalOpen ||
    isItemModalClosing ||
    entityManager.isAddModalOpen ||
    entityManager.isEditModalOpen ||
    isAddSupplierModalOpen ||
    isEditSupplierModalOpen ||
    isAddCustomerModalOpen ||
    isEditCustomerModalOpen ||
    isAddPatientModalOpen ||
    isEditPatientModalOpen ||
    isAddDoctorModalOpen ||
    isEditDoctorModalOpen;
  const tabSelectorLayerClass = isAnyMasterDataModalOpen ? 'z-40' : 'z-[70]';

  useItemMasterItemsGridSync({
    gridApi: unifiedGridApi,
    isAddItemModalOpen,
    isItemModalClosing,
    isItemTab,
    isLoading: activeIsLoading,
    itemsData: itemsManagement.data as ItemDataType[],
  });

  // Removed unified column handlers - now handled by live save in EntityGrid

  // No need for mouse handlers - handled by SlidingSelector

  // Unified rendering - keep tabs always mounted for smooth animation
  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-6">
        <ItemMasterHeader
          activeTab={activeTab}
          pageTitle={pageTitle}
          showTabSelector={showTabSelector}
          tabSelectorContainerRef={tabSelectorContainerRef}
          tabSelectorLayerClass={tabSelectorLayerClass}
          tabSelectorCollapseSignal={tabSelectorCollapseSignal}
          onTabChange={handleTabChange}
          onTabSelectorExpandedChange={handleTabSelectorExpandedChange}
        />

        {/* Unified SearchToolbar */}
        <div className="flex items-center pt-8">
          <div className="grow">
            <SearchToolbar
              searchScopeKey={activeTab}
              searchInputRef={
                searchInputRef as React.RefObject<HTMLInputElement>
              }
              searchBarProps={coordinatedSearchBarProps}
              search={activeSearchValue}
              placeholder={activePlaceholder}
              onAdd={activeOnAdd}
              addTooltipLabel={activeAddTooltipLabel}
              onKeyDown={activeOnKeyDown}
              items={activeItemsSelection}
              onItemSelect={activeOnItemSelect}
              gridApi={unifiedGridApi}
              exportFilename={activeExportFilename}
              exportTooltipLabel={activeExportTooltipLabel}
              onTabNext={enableTabShortcuts ? handleTabNext : undefined}
              onTabPrevious={enableTabShortcuts ? handleTabPrevious : undefined}
            />
          </div>
        </div>

        {/* Unified EntityGrid */}
        <div className="min-h-0 flex-1">
          <EntityGrid
            activeTab={activeTab}
            itemsData={itemsManagement.data as ItemDataType[]}
            suppliersData={suppliersForDisplay}
            entityData={masterDataRows}
            isLoading={activeIsLoading}
            isError={activeIsError}
            error={activeError}
            search={activeSearchValue}
            itemColumnDefs={itemColumnDefs}
            entityConfig={masterDataConfig}
            entityColumnDefs={masterDataColumnDefs}
            supplierColumnDefs={supplierColumnDefs}
            onRowClick={unifiedRowClickHandler}
            onGridReady={handleActiveGridReady}
            isExternalFilterPresent={activeIsExternalFilterPresent}
            doesExternalFilterPass={activeDoesExternalFilterPass}
            onGridApiReady={handleUnifiedGridApiReady}
            itemsPerPage={activeItemsPerPage}
            hideFloatingPagination={isAnyMasterDataModalOpen}
            isRowGroupingEnabled={
              activeTab === 'items' ? isRowGroupingEnabled : false
            }
            defaultExpanded={activeTab === 'items' ? defaultExpanded : 1}
            showGroupPanel={activeTab === 'items' ? showGroupPanel : true}
          />
        </div>
      </div>

      <ItemMasterModalStack
        activeTab={activeTab}
        entityCurrentConfig={entityCurrentConfig}
        entityManager={entityManager}
        identityTabs={identityTabs}
        isCustomerTab={isCustomerTab}
        isDoctorTab={isDoctorTab}
        isItemEntityTab={isItemEntityTab}
        isPatientTab={isPatientTab}
        isSupplierTab={isSupplierTab}
        itemModalState={itemModalState}
        itemsManagement={itemsManagement}
        openConfirmDialog={openConfirmDialog}
        supplierSearch={supplierSearch}
        supplierTab={supplierTab}
      />
    </>
  );
});

ItemMasterNew.displayName = 'ItemMasterNew';

export default ItemMasterNew;
