import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAddItemFormState } from './useItemFormState';
import type { ItemFormData, PackageConversion } from '../../../shared/types';

const makeInitialData = (
  overrides: Partial<ItemFormData> = {}
): ItemFormData => ({
  code: 'ITM-001',
  name: 'Paracetamol',
  manufacturer_id: 'man-1',
  type_id: 'type-1',
  category_id: 'cat-1',
  package_id: 'pkg-1',
  dosage_id: 'dos-1',
  barcode: '12345',
  description: 'desc',
  image_urls: [],
  base_price: 1000,
  sell_price: 1500,
  is_level_pricing_active: true,
  min_stock: 10,
  quantity: 2,
  unit_id: 'unit-1',
  is_active: true,
  is_medicine: true,
  has_expiry_date: false,
  updated_at: null,
  customer_level_discounts: [],
  ...overrides,
});

const makeConversion = (
  overrides: Partial<PackageConversion> = {}
): PackageConversion => ({
  id: 'conv-1',
  unit_name: 'Box',
  to_unit_id: 'unit-box',
  unit: {
    id: 'unit-box',
    name: 'Box',
    code: 'BOX',
    description: null,
    is_active: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  },
  conversion_rate: 10,
  base_price: 100,
  sell_price: 150,
  ...overrides,
});

describe('useAddItemFormState', () => {
  it('initializes from initialSearchQuery and handles input/select updates', () => {
    const { result } = renderHook(() =>
      useAddItemFormState({ initialSearchQuery: 'Pencarian Awal' })
    );

    expect(result.current.formData.name).toBe('Pencarian Awal');

    act(() => {
      result.current.handleChange({
        target: { name: 'base_price', value: 'Rp12.500', type: 'text' },
      } as never);
      result.current.handleChange({
        target: { name: 'sell_price', value: 'Rp15.000', type: 'text' },
      } as never);
      result.current.handleChange({
        target: { name: 'is_active', checked: false, type: 'checkbox' },
      } as never);
      result.current.handleChange({
        target: { name: 'min_stock', value: '7', type: 'number' },
      } as never);
      result.current.handleChange({
        target: { name: 'description', value: 'baru', type: 'text' },
      } as never);
      result.current.handleSelectChange({
        target: { name: 'category_id', value: 'cat-2' },
      } as never);
    });

    expect(result.current.formData.base_price).toBe(12500);
    expect(result.current.formData.sell_price).toBe(15000);
    expect(result.current.displayBasePrice).toContain('Rp');
    expect(result.current.formData.is_active).toBe(false);
    expect(result.current.formData.min_stock).toBe(7);
    expect(result.current.formData.description).toBe('baru');
    expect(result.current.formData.category_id).toBe('cat-2');
  });

  it('sets initial data, computes dirty state, and compares conversions safely', () => {
    const { result } = renderHook(() => useAddItemFormState({}));

    expect(result.current.isDirty()).toBe(false);

    const initialData = makeInitialData({
      customer_level_discounts: undefined,
      base_price: 2000,
      sell_price: 2600,
      min_stock: 15,
    });

    act(() => {
      result.current.setInitialDataForForm(initialData);
      result.current.setInitialPackageConversions([makeConversion()]);
    });

    expect(result.current.formData.customer_level_discounts).toEqual([]);
    expect(result.current.marginPercentage).toBe('30.0');
    expect(result.current.minStockValue).toBe('15');
    expect(result.current.isDirty([makeConversion()])).toBe(false);

    act(() => {
      result.current.updateFormData({ sell_price: 3000 });
    });
    expect(result.current.isDirty([makeConversion()])).toBe(true);

    act(() => {
      result.current.updateFormData({ sell_price: 2600 });
    });
    expect(
      result.current.isDirty([
        makeConversion({ conversion_rate: 12, base_price: 90 }),
      ])
    ).toBe(true);

    expect(
      result.current.isDirty([{ ...makeConversion(), unit: {} as never }])
    ).toBe(false);

    expect(
      result.current.isDirty([
        {
          ...makeConversion(),
          unit: undefined as never,
          to_unit_id: '',
        },
      ])
    ).toBe(true);
  });

  it('resets form based on mode and captured initial state', () => {
    const { result } = renderHook(() =>
      useAddItemFormState({ initialSearchQuery: 'Nama Default' })
    );

    act(() => {
      result.current.setInitialDataForForm(
        makeInitialData({ name: 'Item Edit' })
      );
      result.current.setInitialPackageConversions([makeConversion()]);
      result.current.setIsEditMode(true);
      result.current.updateFormData({
        name: 'Diubah',
        base_price: 5000,
      });
      result.current.setMinStockValue('1');
      result.current.setMarginPercentage('999');
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.name).toBe('Item Edit');
    expect(result.current.formData.base_price).toBe(1000);
    expect(result.current.marginPercentage).toBe('50.0');
    expect(result.current.minStockValue).toBe('10');

    act(() => {
      result.current.setIsEditMode(false);
    });
    act(() => {
      result.current.updateFormData({ name: 'Temporary' });
      result.current.resetForm();
    });

    expect(result.current.formData.name).toBe('Nama Default');
    expect(result.current.formData.code).toBe('');
  });

  it('sorts conversion comparison by unit id regardless of order', () => {
    const { result } = renderHook(() => useAddItemFormState({}));

    act(() => {
      result.current.setInitialDataForForm(makeInitialData());
      result.current.setInitialPackageConversions([
        makeConversion({
          to_unit_id: 'unit-b',
          conversion_rate: 2,
          unit: undefined as never,
        }),
        makeConversion({
          id: 'conv-2',
          to_unit_id: 'unit-a',
          conversion_rate: 3,
          unit: undefined as never,
        }),
      ]);
    });

    expect(
      result.current.isDirty([
        makeConversion({
          id: 'conv-x',
          to_unit_id: 'unit-a',
          conversion_rate: 3,
          unit: undefined as never,
        }),
        makeConversion({
          id: 'conv-y',
          to_unit_id: 'unit-b',
          conversion_rate: 2,
          unit: undefined as never,
        }),
      ])
    ).toBe(false);
  });
});
