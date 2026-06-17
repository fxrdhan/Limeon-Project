import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { MasterDataType } from '../../../shared/types';
import { useItemMasterTabNavigation } from './useItemMasterTabNavigation';

const createSearchRuntime = () => ({
  pattern: '',
  columns: [],
  clearUiOnly: vi.fn(),
});

const createParams = (
  isTabSwitchingRef: RefObject<boolean>,
  navigate: NavigateFunction
) => ({
  activeTab: 'items' as MasterDataType,
  navigate,
  isTabSwitchingRef,
  resetVisibleColumns: vi.fn(),
  searchRuntimes: {
    items: createSearchRuntime(),
    suppliers: createSearchRuntime(),
    customers: createSearchRuntime(),
    patients: createSearchRuntime(),
    doctors: createSearchRuntime(),
    itemEntity: createSearchRuntime(),
  },
  modalState: {
    isAddItemModalOpen: false,
    closeAddItemModal: vi.fn(),
    isAddCustomerModalOpen: false,
    setIsAddCustomerModalOpen: vi.fn(),
    isEditCustomerModalOpen: false,
    setIsEditCustomerModalOpen: vi.fn(),
    isAddPatientModalOpen: false,
    setIsAddPatientModalOpen: vi.fn(),
    isEditPatientModalOpen: false,
    setIsEditPatientModalOpen: vi.fn(),
    isAddDoctorModalOpen: false,
    setIsAddDoctorModalOpen: vi.fn(),
    isEditDoctorModalOpen: false,
    setIsEditDoctorModalOpen: vi.fn(),
  },
});

describe('useItemMasterTabNavigation', () => {
  it('keeps tab switching locked until the latest navigation unlock delay finishes', () => {
    vi.useFakeTimers({ now: 1000 });
    try {
      const navigateMock = vi.fn();
      const navigate = navigateMock as unknown as NavigateFunction;
      const isTabSwitchingRef = { current: false };
      const { result } = renderHook(() =>
        useItemMasterTabNavigation(createParams(isTabSwitchingRef, navigate))
      );

      act(() => {
        result.current.handleTabChange('suppliers', 'suppliers');
        result.current.handleTabChange('customers', 'customers');
      });

      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(isTabSwitchingRef.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(navigateMock).toHaveBeenCalledTimes(2);
      expect(isTabSwitchingRef.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(isTabSwitchingRef.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(isTabSwitchingRef.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
