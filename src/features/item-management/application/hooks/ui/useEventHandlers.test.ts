import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddItemEventHandlers } from './useEventHandlers';

const buildAddItemForm = () => ({
  handleSelectChange: vi.fn(),
  units: [
    { id: 'u-1', name: 'Pcs' },
    { id: 'u-2', name: 'Box' },
  ],
  packageConversionHook: { setBaseUnit: vi.fn() },
  setMarginPercentage: vi.fn(),
  formData: { base_price: 1000, min_stock: 10, is_medicine: true },
  updateFormData: vi.fn(),
  calculateSellPriceFromMargin: vi.fn((margin: number) => 1000 + margin * 10),
  handleChange: vi.fn(),
  calculateProfitPercentage: vi.fn(() => 25.5),
  setEditingMargin: vi.fn(),
  marginPercentage: '25',
  setMinStockValue: vi.fn(),
  setEditingMinStock: vi.fn(),
  minStockValue: '15',
  handleCancel: vi.fn(),
});

describe('useAddItemEventHandlers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('handles select/dropdown changes and margin-based sell price updates', () => {
    const addItemForm = buildAddItemForm();
    const marginInput = document.createElement('input');
    const minStockInput = document.createElement('input');

    const { result } = renderHook(() =>
      useAddItemEventHandlers({
        addItemForm,
        marginInputRef: { current: marginInput },
        minStockInputRef: { current: minStockInput },
      })
    );

    act(() => {
      result.current.handleSelectChange({
        target: { name: 'unit_id', value: 'u-2' },
      } as React.ChangeEvent<HTMLSelectElement>);
      result.current.handleDropdownChange('unit_id', 'u-1');
      result.current.handleMarginChange({
        target: { value: '30' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(addItemForm.handleSelectChange).toHaveBeenCalledTimes(2);
    expect(addItemForm.packageConversionHook.setBaseUnit).toHaveBeenCalledWith(
      'Box'
    );
    expect(addItemForm.packageConversionHook.setBaseUnit).toHaveBeenCalledWith(
      'Pcs'
    );

    expect(addItemForm.setMarginPercentage).toHaveBeenCalledWith('30');
    expect(addItemForm.updateFormData).toHaveBeenCalledWith({
      sell_price: 1300,
    });
  });

  it('manages margin/min-stock editing lifecycle and keyboard handlers', () => {
    const addItemForm = buildAddItemForm();

    const marginInput = document.createElement('input');
    const minStockInput = document.createElement('input');
    const expiryCheckbox = document.createElement('label');

    const marginFocusSpy = vi.spyOn(marginInput, 'focus');
    const marginSelectSpy = vi.spyOn(marginInput, 'select');
    const minStockFocusSpy = vi.spyOn(minStockInput, 'focus');
    const minStockSelectSpy = vi.spyOn(minStockInput, 'select');
    const expiryFocusSpy = vi.spyOn(expiryCheckbox, 'focus');

    const { result } = renderHook(() =>
      useAddItemEventHandlers({
        addItemForm,
        marginInputRef: { current: marginInput },
        minStockInputRef: { current: minStockInput },
        expiryCheckboxRef: { current: expiryCheckbox },
      })
    );

    const preventDefault = vi.fn();

    act(() => {
      result.current.startEditingMargin();
      vi.advanceTimersByTime(10);
      result.current.handleMarginKeyDown({
        key: 'Enter',
        preventDefault,
      } as React.KeyboardEvent<HTMLInputElement>);
      result.current.stopEditingMargin();

      result.current.startEditingMinStock();
      vi.advanceTimersByTime(10);
      result.current.handleMinStockChange({
        target: { value: '8' },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleMinStockKeyDown({
        key: 'Enter',
        preventDefault,
      } as React.KeyboardEvent<HTMLInputElement>);

      addItemForm.minStockValue = '-1';
      result.current.stopEditingMinStock();

      vi.advanceTimersByTime(0);
    });

    expect(marginFocusSpy).toHaveBeenCalled();
    expect(marginSelectSpy).toHaveBeenCalled();
    expect(minStockFocusSpy).toHaveBeenCalled();
    expect(minStockSelectSpy).toHaveBeenCalled();
    expect(expiryFocusSpy).toHaveBeenCalled();

    expect(addItemForm.setEditingMargin).toHaveBeenCalledWith(true);
    expect(addItemForm.setEditingMargin).toHaveBeenCalledWith(false);
    expect(addItemForm.updateFormData).toHaveBeenCalledWith({
      sell_price: 1250,
    });

    expect(addItemForm.setEditingMinStock).toHaveBeenCalledWith(true);
    expect(addItemForm.setEditingMinStock).toHaveBeenCalledWith(false);
    expect(addItemForm.updateFormData).toHaveBeenCalledWith({ min_stock: 15 });
    expect(addItemForm.setMinStockValue).toHaveBeenCalledWith('8');
    expect(addItemForm.setMinStockValue).toHaveBeenCalledWith('10');
  });

  it('syncs margin on sell-price change and forwards cancel action', () => {
    const addItemForm = buildAddItemForm();

    const { result } = renderHook(() =>
      useAddItemEventHandlers({
        addItemForm,
        marginInputRef: { current: document.createElement('input') },
        minStockInputRef: { current: document.createElement('input') },
      })
    );

    const event = {
      target: { value: 'Rp2.000' },
    } as React.ChangeEvent<HTMLInputElement>;

    const closingSetter = vi.fn();

    act(() => {
      result.current.handleSellPriceChange(event);
      vi.advanceTimersByTime(0);
      result.current.handleActualCancel(closingSetter);
    });

    expect(addItemForm.handleChange).toHaveBeenCalledWith(event);
    expect(addItemForm.setMarginPercentage).toHaveBeenCalledWith('25.5');
    expect(addItemForm.handleCancel).toHaveBeenCalledWith(closingSetter);
  });
});
