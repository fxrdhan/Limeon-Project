import type {
  ItemMasterEntityTab,
  MasterDataType,
} from '@/features/item-management/shared/types';
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
