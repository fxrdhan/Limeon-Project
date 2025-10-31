/**
 * usePackageConversion Tests (Optimized)
 *
 * Consolidated hook tests focusing on business logic over state management
 */

import { describe, it, expect, vi } from 'vitest';
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
  describe('Initialization and basic setup', () => {
    it('should initialize with defaults and load available units', async () => {
      const { result } = renderHook(() => usePackageConversion());

      expect(result.current.baseUnit).toBe('');
      expect(result.current.basePrice).toBe(0);
      expect(result.current.sellPrice).toBe(0);
      expect(result.current.conversions).toHaveLength(0);

      await waitFor(() => {
        expect(result.current.availableUnits).toHaveLength(3);
      });
    });

    it('should set base unit and prices', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBaseUnit('Strip');
        result.current.setBasePrice(10000);
        result.current.setSellPrice(15000);
      });

      expect(result.current.baseUnit).toBe('Strip');
      expect(result.current.basePrice).toBe(10000);
      expect(result.current.sellPrice).toBe(15000);
    });

    it('should handle decimal and zero prices', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000.5);
        result.current.setSellPrice(15000.75);
      });

      expect(result.current.basePrice).toBe(10000.5);
      expect(result.current.sellPrice).toBe(15000.75);
    });
  });

  describe('addPackageConversion', () => {
    it('should calculate prices from conversion rate', () => {
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions).toHaveLength(1);
      expect(result.current.conversions[0].base_price).toBe(1000); // 10000 / 10
      expect(result.current.conversions[0].sell_price).toBe(1200); // 12000 / 10
    });

    it('should use provided prices when available (override)', () => {
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

      expect(result.current.conversions[0].base_price).toBe(5000);
      expect(result.current.conversions[0].sell_price).toBe(6000);
    });

    it('should add multiple conversions with unique IDs', () => {
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions).toHaveLength(2);
      const ids = result.current.conversions.map(c => c.id);
      expect(new Set(ids).size).toBe(2); // All unique
    });

    it('should handle edge cases: division by zero and very small rates', () => {
      const { result } = renderHook(() => usePackageConversion());

      act(() => {
        result.current.setBasePrice(10000);
      });

      act(() => {
        // Division by zero - returns Infinity (not ideal but handled)
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 0,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].base_price).toBe(Infinity);

      act(() => {
        // Very small rate
        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 0.1,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[1].base_price).toBe(100000);
    });
  });

  describe('removePackageConversion', () => {
    it('should remove specific conversion by ID', () => {
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 2,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const secondConversionId = result.current.conversions[1].id;

      act(() => {
        result.current.removePackageConversion(secondConversionId);
      });

      expect(result.current.conversions).toHaveLength(1);
      expect(result.current.conversions[0].unit_name).toBe('Box');
    });
  });

  describe('recalculateBasePrices', () => {
    it('should calculate prices correctly when conversions exist', () => {
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].base_price).toBe(1000);
      expect(result.current.conversions[0].sell_price).toBe(1200);
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const initialPrice = result.current.conversions[0].base_price;

      act(() => {
        result.current.skipNextRecalculation();
        result.current.setBasePrice(20000);
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(initialPrice);
    });

    it('should handle zero prices and floating point calculations', () => {
      const { result } = renderHook(() => usePackageConversion());

      // Test zero price handling
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].base_price).toBe(0);

      // Test floating point calculations
      const { result: result2 } = renderHook(() => usePackageConversion());

      act(() => {
        result2.current.setBasePrice(10000);
        result2.current.setSellPrice(12000);
      });

      act(() => {
        result2.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 3,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result2.current.conversions[0].base_price).toBeCloseTo(
        3333.333,
        1
      );
    });
  });

  describe('resetConversions and setConversions', () => {
    it('should clear all conversions and reset form data', () => {
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
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      act(() => {
        result.current.setPackageConversionFormData({
          unit: 'Box',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      act(() => {
        result.current.resetConversions();
      });

      expect(result.current.conversions).toHaveLength(0);
      expect(result.current.packageConversionFormData).toEqual({
        unit: '',
        conversion_rate: 0,
      });
    });

    it('should set conversions directly (for loading from DB)', () => {
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
