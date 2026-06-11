import { restoreConfirmedPattern } from '@/components/search-bar/utils/patternRestoration';
import { parseSearchValue } from '@/components/search-bar/utils/searchUtils';
import {
  LAST_ITEM_MASTER_TAB_SESSION_KEY,
  getItemMasterSearchSessionKey,
  isItemMasterTab,
  type MasterDataType,
} from '@/features/item-management/shared/types';
import type { FilterSearch, SearchColumn } from '@/types/search';

export type SearchPatternSnapshot = {
  pattern: string;
  columns: SearchColumn[];
};

const hasFilterValue = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

export const saveLastTabToSession = (tab: MasterDataType): void => {
  if (!isItemMasterTab(tab)) return;
  try {
    sessionStorage.setItem(LAST_ITEM_MASTER_TAB_SESSION_KEY, tab);
  } catch (error) {
    console.warn('Failed to save last tab to session storage:', error);
  }
};

export const getLastTabFromSession = (): MasterDataType => {
  try {
    const savedTab = sessionStorage.getItem(LAST_ITEM_MASTER_TAB_SESSION_KEY);
    if (savedTab && isItemMasterTab(savedTab)) {
      return savedTab;
    }
  } catch {
    // ignore
  }
  return 'items';
};

export const saveSearchPatternToSession = (
  tab: MasterDataType,
  pattern: string
): void => {
  const sessionKey = getItemMasterSearchSessionKey(tab);
  try {
    if (pattern.trim() === '') {
      sessionStorage.removeItem(sessionKey);
      return;
    }

    sessionStorage.setItem(sessionKey, pattern);
  } catch {
    // ignore
  }
};

export const shouldApplyRestoredFilter = (
  filterSearch: FilterSearch | null
): filterSearch is FilterSearch => {
  if (!filterSearch?.isConfirmed) return false;

  if (filterSearch.filterGroup) return true;

  if (filterSearch.isMultiCondition && filterSearch.conditions) {
    return filterSearch.conditions.every(
      condition =>
        hasFilterValue(condition.value) &&
        (condition.operator !== 'inRange' || hasFilterValue(condition.valueTo))
    );
  }

  return (
    hasFilterValue(filterSearch.value) &&
    (filterSearch.operator !== 'inRange' ||
      hasFilterValue(filterSearch.valueTo))
  );
};

export const normalizePendingOperatorPattern = (
  pattern: string,
  columns: SearchColumn[]
): string => {
  if (pattern.trim() === '') return pattern;

  const parsedSearch = parseSearchValue(pattern, columns);
  if (
    parsedSearch.selectedColumn &&
    !parsedSearch.isFilterMode &&
    !parsedSearch.showColumnSelector &&
    !parsedSearch.showOperatorSelector &&
    pattern.trimStart().startsWith('#') &&
    !pattern.includes(':')
  ) {
    return `#${parsedSearch.selectedColumn.field} #`;
  }

  return pattern;
};

export const saveFilterSearchPatternToSession = (
  tab: MasterDataType,
  filterSearch: FilterSearch | null,
  fallbackSnapshot?: SearchPatternSnapshot
): void => {
  if (!filterSearch) {
    saveSearchPatternToSession(
      tab,
      fallbackSnapshot
        ? normalizePendingOperatorPattern(
            fallbackSnapshot.pattern,
            fallbackSnapshot.columns
          )
        : ''
    );
    return;
  }

  if (!filterSearch.isConfirmed) {
    return;
  }

  saveSearchPatternToSession(
    tab,
    restoreConfirmedPattern({
      ...filterSearch,
      isExplicitOperator: filterSearch.isExplicitOperator ?? true,
    } as unknown as import('@/components/search-bar/types').FilterSearch)
  );
};
