import type { MasterDataType } from '@/features/item-management/shared/types';
import { ITEM_MASTER_SWITCHER_TAB_OPTIONS } from './config';

type ItemMasterSwitcherTabOption =
  (typeof ITEM_MASTER_SWITCHER_TAB_OPTIONS)[number];

export const getAdjacentItemMasterSwitcherTab = (
  activeTab: MasterDataType,
  direction: 'next' | 'previous'
): ItemMasterSwitcherTabOption => {
  const currentIndex = ITEM_MASTER_SWITCHER_TAB_OPTIONS.findIndex(
    option => option.value === activeTab
  );
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  if (direction === 'next') {
    const nextIndex =
      safeIndex < ITEM_MASTER_SWITCHER_TAB_OPTIONS.length - 1
        ? safeIndex + 1
        : 0;
    return ITEM_MASTER_SWITCHER_TAB_OPTIONS[nextIndex];
  }

  const previousIndex =
    safeIndex > 0 ? safeIndex - 1 : ITEM_MASTER_SWITCHER_TAB_OPTIONS.length - 1;
  return ITEM_MASTER_SWITCHER_TAB_OPTIONS[previousIndex];
};
