import type {
  ItemMasterEntityTab,
  MasterDataType,
} from '@/features/item-management/shared/types';
import type { RefObject } from 'react';
import {
  isItemMasterEntityTab,
  isItemMasterTab,
  isOtherMasterDataTab,
} from '@/features/item-management/shared/types';
import { OTHER_MASTER_DATA_CONFIG } from './config';

export const getItemMasterTabFlags = (activeTab: MasterDataType) => ({
  isItemTab: activeTab === 'items',
  isSupplierTab: activeTab === 'suppliers',
  isCustomerTab: activeTab === 'customers',
  isPatientTab: activeTab === 'patients',
  isDoctorTab: activeTab === 'doctors',
  isItemEntityTab: isItemMasterEntityTab(activeTab),
  isOtherMasterTab: isOtherMasterDataTab(activeTab),
  isItemMasterTab: isItemMasterTab(activeTab),
});

export const getItemMasterActiveEntityType = (
  activeTab: MasterDataType
): ItemMasterEntityTab =>
  isItemMasterEntityTab(activeTab) ? activeTab : 'categories';

export const getItemMasterOtherMasterDataConfig = (activeTab: MasterDataType) =>
  isOtherMasterDataTab(activeTab) ? OTHER_MASTER_DATA_CONFIG[activeTab] : null;

export const getItemMasterPageTitle = (
  activeTab: MasterDataType,
  otherMasterDataTitle?: string | null
) =>
  activeTab === 'suppliers'
    ? 'Daftar Supplier'
    : (otherMasterDataTitle ?? 'Item Master');

export const getIsAnyMasterDataModalOpen = (
  modalState: Record<string, boolean>
) => Object.values(modalState).some(Boolean);

export const getItemMasterTabSelectorLayerClass = (
  isAnyMasterDataModalOpen: boolean
) => (isAnyMasterDataModalOpen ? 'z-40' : 'z-[70]');

export const ITEM_MASTER_GRID_GROUPING_DEFAULTS = {
  defaultExpanded: -1,
  isRowGroupingEnabled: true,
  showGroupPanel: true,
} as const;

export const getItemMasterTabInteractionState = (isItemMasterTab: boolean) => ({
  showTabSelector: isItemMasterTab,
  enableTabShortcuts: isItemMasterTab,
});

export const getItemMasterGridGroupingState = (
  activeTab: MasterDataType,
  {
    defaultExpanded,
    isRowGroupingEnabled,
    showGroupPanel,
  }: {
    defaultExpanded: number;
    isRowGroupingEnabled: boolean;
    showGroupPanel: boolean;
  } = ITEM_MASTER_GRID_GROUPING_DEFAULTS
) =>
  activeTab === 'items'
    ? {
        isRowGroupingEnabled,
        defaultExpanded,
        showGroupPanel,
      }
    : {
        isRowGroupingEnabled: false,
        defaultExpanded: 1,
        showGroupPanel: true,
      };

export const getItemMasterCoordinatedSearchBarProps = <
  SearchBarProps extends object,
  IgnoreElement extends HTMLElement,
>(
  searchBarProps: SearchBarProps,
  {
    onSelectorOpenChange,
    selectorOutsideIgnoreRefs,
    suppressSelectors,
  }: {
    onSelectorOpenChange: (isOpen: boolean) => void;
    selectorOutsideIgnoreRefs: RefObject<IgnoreElement | null>[];
    suppressSelectors: boolean;
  }
) => ({
  ...searchBarProps,
  onSelectorOpenChange,
  suppressSelectors,
  selectorOutsideIgnoreRefs,
});
