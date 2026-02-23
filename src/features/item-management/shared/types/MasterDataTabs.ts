export const MASTER_DATA_TABS = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
  'suppliers',
  'customers',
  'patients',
  'doctors',
] as const;

export type MasterDataType = (typeof MASTER_DATA_TABS)[number];

export const ITEM_MASTER_TABS = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
] as const;

export type ItemMasterTab = (typeof ITEM_MASTER_TABS)[number];

export const ITEM_MASTER_ENTITY_TABS = [
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
] as const;

export type ItemMasterEntityTab = (typeof ITEM_MASTER_ENTITY_TABS)[number];

export const OTHER_MASTER_DATA_TABS = [
  'customers',
  'patients',
  'doctors',
] as const;

export type OtherMasterDataTab = (typeof OTHER_MASTER_DATA_TABS)[number];

export const LAST_ITEM_MASTER_TAB_SESSION_KEY = 'item_master_last_tab';

const ITEM_MASTER_SEARCH_SESSION_PREFIX = 'item_master_search_';

export const getItemMasterSearchSessionKey = (tab: MasterDataType): string => {
  return `${ITEM_MASTER_SEARCH_SESSION_PREFIX}${tab}`;
};

export const isMasterDataTab = (tab: string): tab is MasterDataType => {
  return MASTER_DATA_TABS.includes(tab as MasterDataType);
};

export const isItemMasterTab = (tab: string): tab is ItemMasterTab => {
  return ITEM_MASTER_TABS.includes(tab as ItemMasterTab);
};

export const isItemMasterEntityTab = (
  tab: MasterDataType
): tab is ItemMasterEntityTab => {
  return ITEM_MASTER_ENTITY_TABS.includes(tab as ItemMasterEntityTab);
};

export const isOtherMasterDataTab = (
  tab: MasterDataType
): tab is OtherMasterDataTab => {
  return OTHER_MASTER_DATA_TABS.includes(tab as OtherMasterDataTab);
};
