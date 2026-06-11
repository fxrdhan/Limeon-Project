import { parseSearchValue } from '@/components/search-bar/utils/searchUtils';
import type { MasterDataType } from '@/features/item-management/shared/types';
import { getItemMasterSearchSessionKey } from '@/features/item-management/shared/types';
import { buildAdvancedFilterModel } from '@/utils/advancedFilterBuilder';
import type { GridApi } from 'ag-grid-community';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  normalizePendingOperatorPattern,
  saveSearchPatternToSession,
  shouldApplyRestoredFilter,
  type SearchPatternSnapshot,
} from '../sessionState';

type SearchSnapshotsByTab = Partial<
  Record<MasterDataType, SearchPatternSnapshot>
>;

interface UseItemMasterSearchSessionParams {
  activeTab: MasterDataType;
  activeSearchValue: string;
  activeSearchColumns: SearchPatternSnapshot['columns'];
  unifiedGridApi: GridApi | null;
  searchSnapshotsByTabRef: { current: SearchSnapshotsByTab };
  searchSetters: {
    items: (search: string) => void;
    suppliers: (search: string) => void;
    customers: (search: string) => void;
    patients: (search: string) => void;
    doctors: (search: string) => void;
    itemEntity: (search: string) => void;
  };
}

export const useItemMasterSearchSnapshots = () => {
  return useRef<SearchSnapshotsByTab>({});
};

export const useItemMasterSearchSession = ({
  activeTab,
  activeSearchValue,
  activeSearchColumns,
  unifiedGridApi,
  searchSnapshotsByTabRef,
  searchSetters,
}: UseItemMasterSearchSessionParams) => {
  searchSnapshotsByTabRef.current[activeTab] = {
    pattern: activeSearchValue,
    columns: activeSearchColumns,
  };

  useEffect(() => {
    const snapshotsByTab = searchSnapshotsByTabRef.current;

    return () => {
      const snapshot = snapshotsByTab[activeTab];
      if (!snapshot) {
        return;
      }

      saveSearchPatternToSession(
        activeTab,
        normalizePendingOperatorPattern(snapshot.pattern, snapshot.columns)
      );
    };
  }, [activeTab, searchSnapshotsByTabRef]);

  useLayoutEffect(() => {
    const setSearch =
      activeTab === 'items'
        ? searchSetters.items
        : activeTab === 'suppliers'
          ? searchSetters.suppliers
          : activeTab === 'customers'
            ? searchSetters.customers
            : activeTab === 'patients'
              ? searchSetters.patients
              : activeTab === 'doctors'
                ? searchSetters.doctors
                : searchSetters.itemEntity;
    const sessionKey = getItemMasterSearchSessionKey(activeTab);

    let savedPattern = '';
    try {
      savedPattern = sessionStorage.getItem(sessionKey) ?? '';
    } catch {
      // ignore
    }

    const restoredPattern = normalizePendingOperatorPattern(
      savedPattern,
      activeSearchColumns
    );
    if (restoredPattern !== savedPattern) {
      saveSearchPatternToSession(activeTab, restoredPattern);
    }

    setSearch(restoredPattern);

    if (!unifiedGridApi || unifiedGridApi.isDestroyed()) {
      return;
    }

    if (restoredPattern.trim() === '') {
      unifiedGridApi.setAdvancedFilterModel(null);
      return;
    }

    const parsedSearch = parseSearchValue(restoredPattern, activeSearchColumns);
    const filterSearch = parsedSearch.isFilterMode
      ? (parsedSearch.filterSearch ?? null)
      : null;

    unifiedGridApi.setAdvancedFilterModel(
      shouldApplyRestoredFilter(filterSearch)
        ? buildAdvancedFilterModel(filterSearch)
        : null
    );
  }, [activeSearchColumns, activeTab, searchSetters, unifiedGridApi]);
};
