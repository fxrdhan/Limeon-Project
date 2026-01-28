import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversionLogic } from './useConversionLogic';
import type {
  PackageConversion,
  PackageConversionLogicFormData,
} from '../../../shared/types';
import type { ItemPackage } from '@/types/database';

describe('useConversionLogic', () => {
  const mockAvailableUnits: ItemPackage[] = [
    { id: 'unit-1', name: 'Strip' },
    { id: 'unit-2', name: 'Box' },
    { id: 'unit-3', name: 'Tablet' },
  ];

  const mockConversions: PackageConversion[] = [
    {
      id: 'conv-1',
      unit: { id: 'unit-2', name: 'Box' },
      unit_name: 'Box',
      to_unit_id: 'unit-2',
      conversion_rate: 10,
      base_price: 5000,
      sell_price: 6000,
    },
  ];

  const defaultProps = {
    conversions: mockConversions,
    availableUnits: mockAvailableUnits,
    formData: {
      unit: '',
      conversion_rate: 0,
    } as PackageConversionLogicFormData,
    addPackageConversion: vi.fn(),
    setFormData: vi.fn(),
    baseUnit: 'Strip',
  };

  describe('validateAndAddConversion - Valid Cases', () => {
    it('should successfully add valid conversion', () => {
      const addFn = vi.fn();
      const setFormFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 5 },
          addPackageConversion: addFn,
          setFormData: setFormFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: { id: 'unit-3', name: 'Tablet' },
          unit_name: 'Tablet',
          to_unit_id: 'unit-3',
          conversion_rate: 5,
        })
      );
    });

    it('should reset form data after successful add', () => {
      const setFormFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 5 },
          setFormData: setFormFn,
        })
      );

      act(() => {
        result.current.validateAndAddConversion();
      });

      expect(setFormFn).toHaveBeenCalledWith({
        unit: '',
        conversion_rate: 0,
      });
    });

    it('should handle conversion_rate as decimal', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 2.5 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          conversion_rate: 2.5,
        })
      );
    });

    it('should handle very small conversion rates', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 0.1 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          conversion_rate: 0.1,
        })
      );
    });

    it('should handle large conversion rates', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 1000 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          conversion_rate: 1000,
        })
      );
    });
  });

  describe('validateAndAddConversion - Unit Selection Error', () => {
    it('should fail when unit is empty', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: '', conversion_rate: 5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Silakan pilih kemasan!');
      });
    });

    it('should fail when unit is whitespace (treated as invalid unit not found)', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: '   ', conversion_rate: 5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        // Whitespace is truthy, so it passes first check but fails when looking in availableUnits
        expect(response.error).toBe('Kemasan tidak valid!');
      });
    });
  });

  describe('validateAndAddConversion - Conversion Rate Error', () => {
    it('should fail when conversion_rate is zero', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: 0 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Nilai konversi harus lebih dari 0!');
      });
    });

    it('should fail when conversion_rate is negative', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Tablet', conversion_rate: -5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Nilai konversi harus lebih dari 0!');
      });
    });
  });

  describe('validateAndAddConversion - Base Unit Error', () => {
    it('should fail when unit is same as base unit', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Strip', conversion_rate: 5 },
          baseUnit: 'Strip',
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe(
          'Kemasan turunan tidak boleh sama dengan kemasan utama!'
        );
      });
    });

    it('should pass when base unit is not defined', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: 'Strip', conversion_rate: 5 },
          baseUnit: undefined,
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalled();
    });
  });

  describe('validateAndAddConversion - Duplicate Unit Error', () => {
    it('should fail when unit already exists in conversions', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          conversions: [
            {
              id: 'conv-1',
              unit: { id: 'unit-2', name: 'Box' },
              unit_name: 'Box',
              to_unit_id: 'unit-2',
              conversion_rate: 10,
              base_price: 5000,
              sell_price: 6000,
            },
          ],
          formData: { unit: 'Box', conversion_rate: 5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Kemasan tersebut sudah ada dalam daftar!');
      });
    });

    it('should pass when unit is not in existing conversions', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          conversions: [
            {
              id: 'conv-1',
              unit: { id: 'unit-2', name: 'Box' },
              unit_name: 'Box',
              to_unit_id: 'unit-2',
              conversion_rate: 10,
              base_price: 5000,
              sell_price: 6000,
            },
          ],
          formData: { unit: 'Tablet', conversion_rate: 5 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalled();
    });
  });

  describe('validateAndAddConversion - Unit Validity Error', () => {
    it('should fail when selected unit is not in available units', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          availableUnits: [
            { id: 'unit-1', name: 'Strip' },
            { id: 'unit-2', name: 'Box' },
          ],
          formData: { unit: 'InvalidUnit', conversion_rate: 5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Kemasan tidak valid!');
      });
    });

    it('should pass when unit is valid', () => {
      const addFn = vi.fn();
      const setFormFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          conversions: [], // Empty conversions to avoid duplicate error
          baseUnit: 'Strip', // Base unit is different
          availableUnits: [
            { id: 'unit-1', name: 'Strip' },
            { id: 'unit-2', name: 'Box' },
          ],
          formData: { unit: 'Box', conversion_rate: 5 },
          addPackageConversion: addFn,
          setFormData: setFormFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalled();
      expect(setFormFn).toHaveBeenCalled();
    });
  });

  describe('validateAndAddConversion - Multiple Errors', () => {
    it('should fail on first validation error (unit)', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          formData: { unit: '', conversion_rate: 0 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Silakan pilih kemasan!');
      });
    });

    it('should fail on conversion_rate validation before checking duplicates', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          conversions: [
            {
              id: 'conv-1',
              unit: { id: 'unit-2', name: 'Box' },
              unit_name: 'Box',
              to_unit_id: 'unit-2',
              conversion_rate: 10,
              base_price: 5000,
              sell_price: 6000,
            },
          ],
          formData: { unit: 'Box', conversion_rate: 0 }, // Invalid rate
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Nilai konversi harus lebih dari 0!');
      });
    });
  });

  describe('validateAndAddConversion - Edge Cases', () => {
    it('should handle empty available units', () => {
      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          availableUnits: [],
          formData: { unit: 'Tablet', conversion_rate: 5 },
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Kemasan tidak valid!');
      });
    });

    it('should handle empty conversions array', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          conversions: [],
          formData: { unit: 'Tablet', conversion_rate: 5 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalled();
    });

    it('should handle case-sensitive unit matching', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          availableUnits: [
            { id: 'unit-1', name: 'Tablet' },
            { id: 'unit-2', name: 'tablet' },
          ],
          formData: { unit: 'Tablet', conversion_rate: 5 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to_unit_id: 'unit-1',
        })
      );
    });

    it('should handle spaces in unit names', () => {
      const addFn = vi.fn();

      const { result } = renderHook(() =>
        useConversionLogic({
          ...defaultProps,
          availableUnits: [{ id: 'unit-1', name: 'Large Box' }],
          formData: { unit: 'Large Box', conversion_rate: 5 },
          addPackageConversion: addFn,
        })
      );

      act(() => {
        const response = result.current.validateAndAddConversion();
        expect(response.success).toBe(true);
      });

      expect(addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_name: 'Large Box',
        })
      );
    });
  });
});
