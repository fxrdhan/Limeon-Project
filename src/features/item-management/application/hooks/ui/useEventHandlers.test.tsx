import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, RefObject } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { useAddItemEventHandlers } from './useEventHandlers';

const createChangeEvent = (
  name: string,
  value: string
): ChangeEvent<HTMLInputElement> =>
  ({
    target: { name, value },
  }) as ChangeEvent<HTMLInputElement>;

const createAddItemForm = () => ({
  handleSelectChange: vi.fn(),
  units: [],
  packageConversionHook: { setBaseUnit: vi.fn() },
  setMarginPercentage: vi.fn(),
  formData: { base_price: 1000, min_stock: 5, is_medicine: true },
  updateFormData: vi.fn(),
  calculateSellPriceFromMargin: vi.fn((margin: number) => 1000 + margin),
  handleChange: vi.fn(),
  calculateProfitPercentage: vi.fn(() => 25),
  setEditingMargin: vi.fn(),
  marginPercentage: '25',
  setMinStockValue: vi.fn(),
  setEditingMinStock: vi.fn(),
  minStockValue: '5',
  handleCancel: vi.fn(),
});

describe('useAddItemEventHandlers', () => {
  it('keeps only the latest delayed sell price margin sync', () => {
    vi.useFakeTimers();
    try {
      const addItemForm = createAddItemForm();
      let profit = 20;
      addItemForm.calculateProfitPercentage.mockImplementation(() => profit);
      const { result } = renderHook(() =>
        useAddItemEventHandlers({
          addItemForm,
          marginInputRef: { current: null },
          minStockInputRef: { current: null },
        })
      );

      act(() => {
        result.current.handleSellPriceChange(
          createChangeEvent('sell_price', '1200')
        );
        profit = 30;
        result.current.handleSellPriceChange(
          createChangeEvent('sell_price', '1300')
        );
        vi.runOnlyPendingTimers();
      });

      expect(addItemForm.handleChange).toHaveBeenCalledTimes(2);
      expect(addItemForm.calculateProfitPercentage).toHaveBeenCalledTimes(1);
      expect(addItemForm.setMarginPercentage).toHaveBeenCalledWith('30.0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears delayed focus work on unmount', () => {
    vi.useFakeTimers();
    try {
      const addItemForm = createAddItemForm();
      const marginInput = document.createElement('input');
      const focus = vi.spyOn(marginInput, 'focus');
      const select = vi.spyOn(marginInput, 'select');
      const marginInputRef: RefObject<HTMLInputElement | null> = {
        current: marginInput,
      };
      const { result, unmount } = renderHook(() =>
        useAddItemEventHandlers({
          addItemForm,
          marginInputRef,
          minStockInputRef: { current: null },
        })
      );

      act(() => {
        result.current.startEditingMargin();
      });
      unmount();
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(focus).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
