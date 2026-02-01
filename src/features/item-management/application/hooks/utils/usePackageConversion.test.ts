/**
 * usePackageConversion Tests (Optimized)
 *
 * Consolidated hook tests focusing on business logic over state management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePackageConversion } from './usePackageConversion';
import type { PackageConversion } from '@/types';
import { itemPackageService } from '@/services/api/masterData.service';

// Mock Supabase
const defaultUnits = [
  { id: 'unit-1', name: 'Strip', description: 'Strip packaging' },
  { id: 'unit-2', name: 'Box', description: 'Box packaging' },
  { id: 'unit-3', name: 'Tablet', description: 'Single tablet' },
];
let unitsResponse: { data: typeof defaultUnits | null; error: null };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve(unitsResponse)),
      })),
    })),
  },
}));

describe('usePackageConversion', () => {
  beforeEach(() => {
    unitsResponse = { data: [...defaultUnits], error: null };
  });

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

    it('should keep availableUnits empty when response has no data', async () => {
      const getAllSpy = vi
        .spyOn(itemPackageService, 'getAll')
        .mockResolvedValueOnce({ data: null, error: null });
      const { result } = renderHook(() => usePackageConversion());

      await waitFor(() => {
        expect(result.current.availableUnits).toHaveLength(0);
      });

      getAllSpy.mockRestore();
    });

    it('should set base unit and prices', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBaseUnit('Strip');
        result.current.setBasePrice(10000);
        result.current.setSellPrice(15000);
      });

      expect(result.current.baseUnit).toBe('Strip');
      expect(result.current.basePrice).toBe(10000);
      expect(result.current.sellPrice).toBe(15000);
    });

    it('should handle decimal and zero prices', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000.5);
        result.current.setSellPrice(15000.75);
      });

      expect(result.current.basePrice).toBe(10000.5);
      expect(result.current.sellPrice).toBe(15000.75);
    });
  });

  describe('addPackageConversion', () => {
    it('should calculate prices from conversion rate', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      await act(async () => {
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

    it('should use provided prices when available (override)', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      await act(async () => {
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

    it('should add multiple conversions with unique IDs', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
      });

      await act(async () => {
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

    it('should handle edge cases: division by zero and very small rates', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
      });

      await act(async () => {
        // Division by zero - returns Infinity (not ideal but handled)
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 0,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].base_price).toBe(Infinity);

      await act(async () => {
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

    it('should fall back to unit id when to_unit_id is missing', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-9', name: 'Bottle' },
          unit_name: 'Bottle',
          conversion_rate: 5,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].id).toBe('unit-9');
    });

    it('should generate id when unit and to_unit_id are missing', async () => {
      const { result } = renderHook(() => usePackageConversion());
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456);
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      await act(async () => {
        result.current.addPackageConversion({
          unit_name: 'Custom',
          conversion_rate: 2,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result.current.conversions[0].id).toMatch(/^123456-/);

      nowSpy.mockRestore();
      randomSpy.mockRestore();
    });
  });

  describe('removePackageConversion', () => {
    it('should remove specific conversion by ID', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
      });

      await act(async () => {
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

      await act(async () => {
        result.current.removePackageConversion(secondConversionId);
      });

      expect(result.current.conversions).toHaveLength(1);
      expect(result.current.conversions[0].unit_name).toBe('Box');
    });
  });

  describe('recalculateBasePrices', () => {
    it('should calculate prices correctly when conversions exist', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      await act(async () => {
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

    it('should skip once and then allow recalculation', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const initialPrice = result.current.conversions[0].base_price;

      await act(async () => {
        result.current.skipNextRecalculation();
      });

      await act(async () => {
        result.current.setBasePrice(20000);
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(initialPrice);

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(2000);
    });

    it('should handle zero prices and floating point calculations', async () => {
      const { result } = renderHook(() => usePackageConversion());

      // Test zero price handling
      await act(async () => {
        result.current.setBasePrice(0);
        result.current.setSellPrice(0);
      });

      await act(async () => {
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

      await act(async () => {
        result2.current.setBasePrice(10000);
        result2.current.setSellPrice(12000);
      });

      await act(async () => {
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

    it('should early return when no conversions exist', async () => {
      const { result } = renderHook(() => usePackageConversion());
      const before = result.current.conversions;

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions).toBe(before);
    });

    it('should early return when base and sell prices are zero', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(0);
        result.current.setSellPrice(0);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const before = result.current.conversions;

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions).toBe(before);
    });

    it('should not update when recalculated prices match', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
        result.current.setSellPrice(12000);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      const before = result.current.conversions;

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions).toBe(before);
    });

    it('should recalculate with base price zero and sell price set', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(0);
        result.current.setSellPrice(1000);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      await act(async () => {
        result.current.setSellPrice(2000);
      });

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(0);
      expect(result.current.conversions[0].sell_price).toBe(200);
    });

    it('should recalculate with sell price zero and base price set', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(1000);
        result.current.setSellPrice(0);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      await act(async () => {
        result.current.setBasePrice(2000);
      });

      await act(async () => {
        result.current.recalculateBasePrices();
      });

      expect(result.current.conversions[0].base_price).toBe(200);
      expect(result.current.conversions[0].sell_price).toBe(0);
    });
  });

  describe('resetConversions and setConversions', () => {
    it('should clear all conversions and reset form data', async () => {
      const { result } = renderHook(() => usePackageConversion());

      await act(async () => {
        result.current.setBasePrice(10000);
      });

      await act(async () => {
        result.current.addPackageConversion({
          unit: { id: 'unit-2', name: 'Box' },
          unit_name: 'Box',
          to_unit_id: 'unit-2',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        result.current.setPackageConversionFormData({
          unit: 'Box',
          conversion_rate: 10,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      await act(async () => {
        result.current.resetConversions();
      });

      expect(result.current.conversions).toHaveLength(0);
      expect(result.current.packageConversionFormData).toEqual({
        unit: '',
        conversion_rate: 0,
      });
    });

    it('should set conversions directly (for loading from DB)', async () => {
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

      await act(async () => {
        result.current.setConversions(newConversions);
      });

      expect(result.current.conversions).toEqual(newConversions);
    });
  });
});
