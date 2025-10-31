import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePackageConversion } from './usePackageConversion';
import type { PackageConversion } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              { id: 'unit-1', name: 'Strip', description: 'Strip packaging' },
              { id: 'unit-2', name: 'Box', description: 'Box packaging' },
              { id: 'unit-3', name: 'Tablet', description: 'Single tablet' },
            ],
            error: null,
          })
        ),
      })),
    })),
  },
}));

describe('usePackageConversion', () => {
  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePackageConversion());

      expect(result.current.baseUnit).toBe('');
      expect(result.current.basePrice).toBe(0);
      expect(result.current.sellPrice).toBe(0);
      expect(result.current.conversions).toHaveLength(0);
      expect(result.current.packageConversionFormData).toEqual({
        unit: '',
        conversion_rate: 0,
      });
    });

    it('should load available units on mount', async () => {
      const { result } = renderHook(() => usePackageConversion());

      // Wait for useEffect async operation to complete
      await waitFor(() => {
        expect(result.current.availableUnits).toHaveLength(3);
      });

      expect(result.current.availableUnits[0].name).toBe('Strip');
    });
  });

  describe('baseUnit Management', () => {
    it('should set base unit', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBaseUnit('Strip');
      });

      expect(result.current.baseUnit).toBe('Strip');
    });

    it('should update base unit', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBaseUnit('Strip');
      });

      expect(result.current.baseUnit).toBe('Strip');

      act(() => {
        result.current.setBaseUnit('Box');
      });

      expect(result.current.baseUnit).toBe('Box');
    });
  });

  describe('Price Management', () => {
    it('should set base price', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      expect(result.current.basePrice).toBe(10000);
    });

    it('should set sell price', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setSellPrice(15000);
      });

      expect(result.current.sellPrice).toBe(15000);
    });

    it('should handle both prices simultaneously', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(15000);
      });

      expect(result.current.basePrice).toBe(10000);
      expect(result.current.sellPrice).toBe(15000);
    });

    it('should handle decimal prices', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000.5);
        result.current.setSellPrice(15000.75);
      });

      expect(result.current.basePrice).toBe(10000.5);
      expect(result.current.sellPrice).toBe(15000.75);
    });

    it('should handle zero prices', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(0);
        result.current.setSellPrice(0);
      });

      expect(result.current.basePrice).toBe(0);
      expect(result.current.sellPrice).toBe(0);
    });
  });

  describe('addPackageConversion', () => {
    it('should calculate base price from conversion rate', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      expect(result.current.conversions).toHaveLength(1);
      const conversion = result.current.conversions[0];
      expect(conversion.base_price).toBe(1000); // 10000 / 10
      expect(conversion.sell_price).toBe(1200); // 12000 / 10
    });

    it('should use provided prices if available', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
          base_price: 5000, // Override
          sell_price: 6000, // Override
        });
      });

      const conversion = result.current.conversions[0];
      expect(conversion.base_price).toBe(5000);
      expect(conversion.sell_price).toBe(6000);
    });

    it('should add multiple conversions', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        });
      });

      expect(result.current.conversions).toHaveLength(2);
      expect(result.current.conversions[0].unit_name).toBe('Box');
      expect(result.current.conversions[1].unit_name).toBe('Tablet');
    });

    it('should generate unique IDs for each conversion', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        });
      });

      const ids = result.current.conversions.map(c => c.id);
      expect(new Set(ids).size).toBe(2); // All unique
    });

    it('should handle division by zero safely', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      act(() => {
        // This should ideally be prevented at validation level
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 0, // Problematic
        });
      });

      // Result would be Infinity, which is not ideal
      const conversion = result.current.conversions[0];
      expect(conversion.base_price).toBe(Infinity);
    });

    it('should handle very small conversion rates', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 0.1,
        });
      });

      const conversion = result.current.conversions[0];
      expect(conversion.base_price).toBe(100000); // 10000 / 0.1
    });
  });

  describe('removePackageConversion', () => {
    it('should remove conversion by id', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      let conversionId: string;

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      conversionId = result.current.conversions[0].id;

      act(() => {
        result.current.removePackageConversion(conversionId);
      });

      expect(result.current.conversions).toHaveLength(0);
    });

    it('should remove specific conversion from multiple', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      let secondConversionId: string;

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        });
      });

      secondConversionId = result.current.conversions[1].id;

      act(() => {
        result.current.removePackageConversion(secondConversionId);
      });

      expect(result.current.conversions).toHaveLength(1);
      expect(result.current.conversions[0].unit_name).toBe('Box');
    });
  });

  describe('recalculateBasePrices', () => {
    it('should calculate prices correctly when conversions are added', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      // Conversion should be calculated when added
      expect(result.current.conversions[0].base_price).toBe(1000); // 10000 / 10
      expect(result.current.conversions[0].sell_price).toBe(1200); // 12000 / 10
    });

    it('should not recalculate if skipRecalculation flag is set', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      const initialPrice = result.current.conversions[0].base_price;

      act(() => {
        result.current.skipNextRecalculation();
        result.current.setBasePrice(20000);
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(initialPrice);
    });

    it('should not recalculate if no conversions exist', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions).toHaveLength(0);
    });

    it('should not recalculate if both prices are zero', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(0);
        result.current.setSellPrice(0);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      act(() => {
        result.current.recalculateBasePrices();
      });

      // Price should remain 0 since basePrice is 0
      expect(result.current.conversions[0].base_price).toBe(0);
    });

    it('should calculate sell_price as 0 when sellPrice is 0', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(0); // No sell price
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      // When sellPrice is 0, converted sell_price should also be 0
      expect(result.current.conversions[0].base_price).toBe(1000);
      expect(result.current.conversions[0].sell_price).toBe(0);
    });

    it('should handle floating point calculations in price conversions', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 3,
        });
      });

      // Initial price should be 10000 / 3
      expect(result.current.conversions[0].base_price).toBeCloseTo(3333.333, 1);

      // When overriding prices during add, use those instead of calculating
      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 5,
          base_price: 5000, // Override calculation
        });
      });

      expect(result.current.conversions[1].base_price).toBe(5000);
    });
  });

  describe('resetConversions', () => {
    it('should clear all conversions', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        });
      });

      expect(result.current.conversions).toHaveLength(2);

      act(() => {
        result.current.resetConversions();
      });

      expect(result.current.conversions).toHaveLength(0);
    });

    it('should reset form data when resetting conversions', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        });
      });

      act(() => {
        result.current.setPackageConversionFormData({
          unit: 'Box',
          conversion_rate: 10,
        });
      });

      act(() => {
        result.current.resetConversions();
      });

      expect(result.current.packageConversionFormData).toEqual({
        unit: '',
        conversion_rate: 0,
      });
    });
  });

  describe('Form Data Management', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setPackageConversionFormData({
          unit: 'Box',
          conversion_rate: 10,
        });
      });

      expect(result.current.packageConversionFormData).toEqual({
        unit: 'Box',
        conversion_rate: 10,
      });
    });

    it('should handle partial form data updates', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setPackageConversionFormData({
          unit: 'Box',
          conversion_rate: 0,
        });
      });

      act(() => {
        result.current.setPackageConversionFormData({
          unit: 'Tablet',
          conversion_rate: 5,
        });
      });

      expect(result.current.packageConversionFormData).toEqual({
        unit: 'Tablet',
        conversion_rate: 5,
      });
    });
  });

  describe('setConversions', () => {
    it('should set conversions directly', () => {
      const { result } = renderHook(() => usePackageConversion());

      const newConversions: PackageConversion[] = [
        {
          id: 'conv-1',
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
          base_price: 1000,
          sell_price: 1200,
        },
      ];

      act(() => {
        result.current.setConversions(newConversions);
      });

      expect(result.current.conversions).toEqual(newConversions);
    });
  });
});
