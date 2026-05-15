import { Navigate } from 'react-router-dom';

import { getMasterDataPathForTab } from '@/features/item-management/shared/masterDataNavigation';
import {
  ITEM_MASTER_TABS,
  LAST_ITEM_MASTER_TAB_SESSION_KEY,
  type ItemMasterTab,
} from '@/features/item-management/shared/types';

const getLastTabFromSession = (): ItemMasterTab => {
  try {
    const savedTab = sessionStorage.getItem(LAST_ITEM_MASTER_TAB_SESSION_KEY);

    if (savedTab && ITEM_MASTER_TABS.includes(savedTab as ItemMasterTab)) {
      return savedTab as ItemMasterTab;
    }
  } catch {
    // Session storage error, fallback to default
  }

  // Default fallback
  return 'items';
};

/**
 * Smart redirect component for Item Master routing
 * Redirects to the last visited tab stored in session storage
 * Falls back to 'items' if no session data exists
 */
export const ItemMasterRedirect = () => {
  const targetTab = getLastTabFromSession();
  const redirectPath = getMasterDataPathForTab(targetTab);

  return <Navigate to={redirectPath} replace />;
};

export default ItemMasterRedirect;
