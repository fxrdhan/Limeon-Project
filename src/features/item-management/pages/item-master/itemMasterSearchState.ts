import type { MasterDataType } from '@/features/item-management/shared/types';

export type ItemMasterSearchRuntimeKey =
  | 'items'
  | 'suppliers'
  | 'customers'
  | 'patients'
  | 'doctors'
  | 'itemEntity';

export type ItemMasterSearchRuntimeMap<T> = Record<
  ItemMasterSearchRuntimeKey,
  T
>;

export const getItemMasterSearchRuntimeKey = (
  activeTab: MasterDataType
): ItemMasterSearchRuntimeKey => {
  if (activeTab === 'items') return 'items';
  if (activeTab === 'suppliers') return 'suppliers';
  if (activeTab === 'customers') return 'customers';
  if (activeTab === 'patients') return 'patients';
  if (activeTab === 'doctors') return 'doctors';
  return 'itemEntity';
};

export const getActiveItemMasterSearchRuntime = <T>(
  activeTab: MasterDataType,
  runtimes: ItemMasterSearchRuntimeMap<T>
) => runtimes[getItemMasterSearchRuntimeKey(activeTab)];
