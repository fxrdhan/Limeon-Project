import type { MasterDataType } from '@/features/item-management/shared/types';
import type { SearchColumn } from '@/types/search';
import type { NavigateFunction } from 'react-router-dom';
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { getMasterDataPathForTab } from '../config';
import { getActiveItemMasterSearchRuntime } from '../itemMasterSearchState';
import { getAdjacentItemMasterSwitcherTab } from '../itemMasterTabNavigationState';
import {
  normalizePendingOperatorPattern,
  saveLastTabToSession,
  saveSearchPatternToSession,
} from '../sessionState';

const TAB_CHANGE_COOLDOWN_MS = 250;
const TAB_SWITCH_FILTER_UNLOCK_DELAY_MS = 500;

export interface SearchRuntime {
  pattern: string;
  columns: SearchColumn[];
  clearUiOnly: () => void;
}

interface UseItemMasterTabNavigationParams {
  activeTab: MasterDataType;
  navigate: NavigateFunction;
  isTabSwitchingRef: RefObject<boolean>;
  resetVisibleColumns: () => void;
  searchRuntimes: {
    items: SearchRuntime;
    suppliers: SearchRuntime;
    customers: SearchRuntime;
    patients: SearchRuntime;
    doctors: SearchRuntime;
    itemEntity: SearchRuntime;
  };
  modalState: {
    isAddItemModalOpen: boolean;
    closeAddItemModal: () => void;
    isAddCustomerModalOpen: boolean;
    setIsAddCustomerModalOpen: (isOpen: boolean) => void;
    isEditCustomerModalOpen: boolean;
    setIsEditCustomerModalOpen: (isOpen: boolean) => void;
    isAddPatientModalOpen: boolean;
    setIsAddPatientModalOpen: (isOpen: boolean) => void;
    isEditPatientModalOpen: boolean;
    setIsEditPatientModalOpen: (isOpen: boolean) => void;
    isAddDoctorModalOpen: boolean;
    setIsAddDoctorModalOpen: (isOpen: boolean) => void;
    isEditDoctorModalOpen: boolean;
    setIsEditDoctorModalOpen: (isOpen: boolean) => void;
  };
}

export const useItemMasterTabNavigation = ({
  activeTab,
  navigate,
  isTabSwitchingRef,
  resetVisibleColumns,
  searchRuntimes,
  modalState,
}: UseItemMasterTabNavigationParams) => {
  const lastNavigationTimeRef = useRef<number>(0);
  const pendingTabRef = useRef<MasterDataType | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingTabRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingTabRef.current = null;
  }, [activeTab]);

  const clearOpenModals = useCallback(() => {
    if (modalState.isAddItemModalOpen) {
      modalState.closeAddItemModal();
    }

    if (modalState.isAddCustomerModalOpen) {
      modalState.setIsAddCustomerModalOpen(false);
    }
    if (modalState.isEditCustomerModalOpen) {
      modalState.setIsEditCustomerModalOpen(false);
    }
    if (modalState.isAddPatientModalOpen) {
      modalState.setIsAddPatientModalOpen(false);
    }
    if (modalState.isEditPatientModalOpen) {
      modalState.setIsEditPatientModalOpen(false);
    }
    if (modalState.isAddDoctorModalOpen) {
      modalState.setIsAddDoctorModalOpen(false);
    }
    if (modalState.isEditDoctorModalOpen) {
      modalState.setIsEditDoctorModalOpen(false);
    }
  }, [modalState]);

  const performNavigation = useCallback(
    (targetTab: MasterDataType) => {
      const currentSearchRuntime = getActiveItemMasterSearchRuntime(
        activeTab,
        searchRuntimes
      );

      saveSearchPatternToSession(
        activeTab,
        normalizePendingOperatorPattern(
          currentSearchRuntime.pattern,
          currentSearchRuntime.columns
        )
      );

      void navigate(getMasterDataPathForTab(targetTab));
      saveLastTabToSession(targetTab);

      isTabSwitchingRef.current = true;
      currentSearchRuntime.clearUiOnly();
      resetVisibleColumns();

      setTimeout(() => {
        isTabSwitchingRef.current = false;
      }, TAB_SWITCH_FILTER_UNLOCK_DELAY_MS);

      clearOpenModals();
    },
    [
      activeTab,
      clearOpenModals,
      isTabSwitchingRef,
      navigate,
      resetVisibleColumns,
      searchRuntimes,
    ]
  );

  const handleTabChange = useCallback(
    (_key: string, value: MasterDataType) => {
      if (value === activeTab) return;

      const now = Date.now();
      const timeSinceLastNav = now - lastNavigationTimeRef.current;
      const isInCooldown = timeSinceLastNav < TAB_CHANGE_COOLDOWN_MS;

      if (!isInCooldown) {
        performNavigation(value);
        lastNavigationTimeRef.current = now;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingTabRef.current = null;
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      pendingTabRef.current = value;
      debounceTimerRef.current = setTimeout(() => {
        if (pendingTabRef.current) {
          performNavigation(pendingTabRef.current);
          lastNavigationTimeRef.current = Date.now();
          pendingTabRef.current = null;
        }
        debounceTimerRef.current = null;
      }, TAB_CHANGE_COOLDOWN_MS);
    },
    [activeTab, performNavigation]
  );

  const handleTabNext = useCallback(() => {
    const nextTab = getAdjacentItemMasterSwitcherTab(activeTab, 'next');
    handleTabChange(nextTab.key, nextTab.value);
  }, [activeTab, handleTabChange]);

  const handleTabPrevious = useCallback(() => {
    const previousTab = getAdjacentItemMasterSwitcherTab(activeTab, 'previous');
    handleTabChange(previousTab.key, previousTab.value);
  }, [activeTab, handleTabChange]);

  return {
    handleTabChange,
    handleTabNext,
    handleTabPrevious,
  };
};
