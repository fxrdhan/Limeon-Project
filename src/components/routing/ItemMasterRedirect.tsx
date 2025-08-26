import { Navigate } from 'react-router-dom';

const LAST_TAB_SESSION_KEY = 'item_master_last_tab';

type MasterDataType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units';

const VALID_TABS: MasterDataType[] = [
  'items',
  'categories',
  'types',
  'packages',
  'dosages',
  'manufacturers',
  'units',
];

const getLastTabFromSession = (): MasterDataType => {
  try {
    const savedTab = sessionStorage.getItem(LAST_TAB_SESSION_KEY);

    if (savedTab && VALID_TABS.includes(savedTab as MasterDataType)) {
      return savedTab as MasterDataType;
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
  const redirectPath = `/master-data/item-master/${targetTab}`;

  return <Navigate to={redirectPath} replace />;
};

export default ItemMasterRedirect;
