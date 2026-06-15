import type { Item as ItemDataType } from '@/types/database';
import type { KeyboardEvent } from 'react';
import type { ItemMasterActiveViewFlags } from './itemMasterActiveViewState';

export type ItemMasterActiveAddActions = {
  activeSearchValue: string;
  handleAddItem: (itemId?: string, searchQuery?: string) => void;
  openAddSupplierModal: () => void;
  openAddEntityModal: () => void;
  openAddCustomerModal: () => void;
  openAddPatientModal: () => void;
  openAddDoctorModal: () => void;
};

export type ItemMasterActiveKeyDownHandlers = {
  handleCustomerKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handlePatientKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleDoctorKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export type ItemMasterActiveItemSelection = {
  itemsData: ItemDataType[];
  handleItemSelect: (item: { id: string }) => void;
};

export const runItemMasterActiveAddAction = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    | 'isItemTab'
    | 'isSupplierTab'
    | 'isCustomerTab'
    | 'isPatientTab'
    | 'isDoctorTab'
  >,
  actions: ItemMasterActiveAddActions
) => {
  if (flags.isItemTab) {
    actions.handleAddItem(undefined, actions.activeSearchValue);
    return;
  }
  if (flags.isSupplierTab) {
    actions.openAddSupplierModal();
    return;
  }
  if (flags.isCustomerTab) {
    actions.openAddCustomerModal();
    return;
  }
  if (flags.isPatientTab) {
    actions.openAddPatientModal();
    return;
  }
  if (flags.isDoctorTab) {
    actions.openAddDoctorModal();
    return;
  }
  actions.openAddEntityModal();
};

export const getItemMasterActiveKeyDownHandler = (
  flags: Pick<
    ItemMasterActiveViewFlags,
    'isCustomerTab' | 'isPatientTab' | 'isDoctorTab'
  >,
  handlers: ItemMasterActiveKeyDownHandlers
) =>
  flags.isCustomerTab
    ? handlers.handleCustomerKeyDown
    : flags.isPatientTab
      ? handlers.handlePatientKeyDown
      : flags.isDoctorTab
        ? handlers.handleDoctorKeyDown
        : undefined;

export const getItemMasterActiveItemSelection = (
  flags: Pick<ItemMasterActiveViewFlags, 'isItemTab'>,
  selection: ItemMasterActiveItemSelection
) => ({
  activeItemsSelection: flags.isItemTab ? selection.itemsData : undefined,
  activeOnItemSelect: flags.isItemTab ? selection.handleItemSelect : undefined,
});
