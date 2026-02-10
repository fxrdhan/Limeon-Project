import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useItemFormReset } from './useItemFormReset';

describe('useItemFormReset', () => {
  it('resets edit mode form and restores conversions from initial package data', () => {
    const resetForm = vi.fn();
    const resetConversions = vi.fn();
    const setBaseUnit = vi.fn();
    const setBasePrice = vi.fn();
    const setSellPrice = vi.fn();
    const skipNextRecalculation = vi.fn();
    const addPackageConversion = vi.fn();
    const clearCache = vi.fn();

    const { result } = renderHook(() =>
      useItemFormReset({
        formState: {
          resetForm,
          isEditMode: true,
          initialFormData: {
            unit_id: 'unit-base',
            base_price: 1000,
            sell_price: 1500,
          } as never,
          initialPackageConversions: [
            {
              id: 'conv-1',
              unit_name: 'Strip',
              conversion_rate: 10,
              base_price: 100,
              sell_price: 150,
            },
            {
              id: 'conv-2',
              unit_name: 'Unknown',
              conversion_rate: 12,
            },
            {
              id: 'conv-3',
              unit_name: 'Box',
              conversion_rate: 'invalid',
            },
          ] as never,
          units: [
            { id: 'unit-base', name: 'Tablet' },
            { id: 'unit-strip', name: 'Strip' },
            { id: 'unit-box', name: 'Box' },
          ] as never,
        },
        packageConversionHook: {
          resetConversions,
          setBaseUnit,
          setBasePrice,
          setSellPrice,
          skipNextRecalculation,
          addPackageConversion,
        },
        cache: {
          clearCache,
        },
      })
    );

    act(() => {
      result.current.resetForm();
    });

    expect(resetForm).toHaveBeenCalledTimes(1);
    expect(resetConversions).toHaveBeenCalledTimes(1);
    expect(setBaseUnit).toHaveBeenCalledWith('Tablet');
    expect(setBasePrice).toHaveBeenCalledWith(1000);
    expect(setSellPrice).toHaveBeenCalledWith(1500);
    expect(skipNextRecalculation).toHaveBeenCalledTimes(1);

    expect(addPackageConversion).toHaveBeenCalledTimes(1);
    expect(addPackageConversion).toHaveBeenCalledWith({
      id: 'conv-1',
      to_unit_id: 'unit-strip',
      unit_name: 'Strip',
      unit: { id: 'unit-strip', name: 'Strip' },
      conversion_rate: 10,
      base_price: 100,
      sell_price: 150,
    });

    expect(clearCache).not.toHaveBeenCalled();
  });

  it('resets add mode conversion state and clears cache', () => {
    const clearCache = vi.fn();
    const resetConversions = vi.fn();
    const setBaseUnit = vi.fn();
    const setBasePrice = vi.fn();
    const setSellPrice = vi.fn();

    const { result } = renderHook(() =>
      useItemFormReset({
        formState: {
          resetForm: vi.fn(),
          isEditMode: false,
          initialFormData: null,
          initialPackageConversions: null,
          units: [],
        },
        packageConversionHook: {
          resetConversions,
          setBaseUnit,
          setBasePrice,
          setSellPrice,
          skipNextRecalculation: vi.fn(),
          addPackageConversion: vi.fn(),
        },
        cache: {
          clearCache,
        },
      })
    );

    act(() => {
      result.current.resetForm();
    });

    expect(resetConversions).toHaveBeenCalledTimes(1);
    expect(setBaseUnit).toHaveBeenCalledWith('');
    expect(setBasePrice).toHaveBeenCalledWith(0);
    expect(setSellPrice).toHaveBeenCalledWith(0);
    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it('uses fallback values for missing conversion fields in edit mode', () => {
    const addPackageConversion = vi.fn();
    const setBaseUnit = vi.fn();

    const { result } = renderHook(() =>
      useItemFormReset({
        formState: {
          resetForm: vi.fn(),
          isEditMode: true,
          initialFormData: {
            unit_id: 'unit-base',
            base_price: undefined,
            sell_price: undefined,
          } as never,
          initialPackageConversions: [
            {
              unit_name: 'Strip',
              conversion_rate: 2,
            },
          ] as never,
          units: [
            { id: 'unit-base', name: 'Base' },
            { id: 'unit-strip', name: 'Strip' },
          ] as never,
        },
        packageConversionHook: {
          resetConversions: vi.fn(),
          setBaseUnit,
          setBasePrice: vi.fn(),
          setSellPrice: vi.fn(),
          skipNextRecalculation: vi.fn(),
          addPackageConversion,
        },
        cache: {
          clearCache: vi.fn(),
        },
      })
    );

    act(() => {
      result.current.resetForm();
    });

    expect(addPackageConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('temp-'),
        base_price: 0,
        sell_price: 0,
      })
    );
    expect(setBaseUnit).toHaveBeenCalledWith('Base');

    const { result: noUnitMatchResult } = renderHook(() =>
      useItemFormReset({
        formState: {
          resetForm: vi.fn(),
          isEditMode: true,
          initialFormData: {
            unit_id: 'unknown-unit',
            base_price: 1,
            sell_price: 2,
          } as never,
          initialPackageConversions: [] as never,
          units: [{ id: 'unit-strip', name: 'Strip' }] as never,
        },
        packageConversionHook: {
          resetConversions: vi.fn(),
          setBaseUnit,
          setBasePrice: vi.fn(),
          setSellPrice: vi.fn(),
          skipNextRecalculation: vi.fn(),
          addPackageConversion: vi.fn(),
        },
        cache: {
          clearCache: vi.fn(),
        },
      })
    );

    act(() => {
      noUnitMatchResult.current.resetForm();
    });

    expect(setBaseUnit).toHaveBeenCalledWith('');
  });
});
