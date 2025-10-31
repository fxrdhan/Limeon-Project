import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useItemCodeGenerator,
  generateItemCodeWithSequence,
} from './useItemCodeGenerator';
import type { DropdownOption } from '@/types/components';

describe('useItemCodeGenerator', () => {
  const mockCategories: DropdownOption[] = [
    { id: 'cat-1', name: 'Obat', code: 'OB' },
    { id: 'cat-2', name: 'Suplemen', code: 'SUP' },
  ];

  const mockTypes: DropdownOption[] = [
    { id: 'type-1', name: 'Tablet', code: 'TAB' },
    { id: 'type-2', name: 'Kapsul', code: 'KAP' },
  ];

  const mockPackages: DropdownOption[] = [
    { id: 'pkg-1', name: 'Strip', code: 'STR' },
    { id: 'pkg-2', name: 'Box', code: 'BOX' },
  ];

  const mockDosages: DropdownOption[] = [
    { id: 'dos-1', name: '500mg', code: '500' },
    { id: 'dos-2', name: '1000mg', code: '1000' },
  ];

  const mockManufacturers: DropdownOption[] = [
    { id: 'mfr-1', name: 'Pharma A', code: 'PHA' },
    { id: 'mfr-2', name: 'Pharma B', code: 'PHB' },
  ];

  const defaultProps = {
    categoryId: 'cat-1',
    typeId: 'type-1',
    packageId: 'pkg-1',
    dosageId: 'dos-1',
    manufacturerId: 'mfr-1',
    categories: mockCategories,
    types: mockTypes,
    packages: mockPackages,
    dosages: mockDosages,
    manufacturers: mockManufacturers,
  };

  describe('useItemCodeGenerator - Complete Code Generation', () => {
    it('should generate complete code when all fields are selected', () => {
      const { result } = renderHook(() => useItemCodeGenerator(defaultProps));

      expect(result.current.generatedCode).toBe('OB-TAB-STR-500-PHA-[XXX]');
      expect(result.current.isComplete).toBe(true);
      expect(result.current.missingFields).toHaveLength(0);
    });

    it('should generate code with all parts joined by hyphen', () => {
      const { result } = renderHook(() => useItemCodeGenerator(defaultProps));

      const parts = result.current.generatedCode.split('-');
      expect(parts).toEqual(['OB', 'TAB', 'STR', '500', 'PHA', '[XXX]']);
    });

    it('should update code when category changes', () => {
      const { result, rerender } = renderHook(
        props => useItemCodeGenerator(props),
        {
          initialProps: defaultProps,
        }
      );

      expect(result.current.generatedCode).toContain('OB');

      rerender({
        ...defaultProps,
        categoryId: 'cat-2',
      });

      expect(result.current.generatedCode).toContain('SUP');
    });
  });

  describe('useItemCodeGenerator - Missing Category', () => {
    it('should not include category code when categoryId is empty', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categoryId: '',
        })
      );

      expect(result.current.generatedCode).toBe('TAB-STR-500-PHA-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Kategori');
    });

    it('should not include category code when code is not found', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categoryId: 'invalid-id',
        })
      );

      expect(result.current.generatedCode).toBe('TAB-STR-500-PHA-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Kategori');
    });
  });

  describe('useItemCodeGenerator - Missing Type', () => {
    it('should not include type code when typeId is empty', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          typeId: '',
        })
      );

      expect(result.current.generatedCode).toBe('OB-STR-500-PHA-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Jenis');
    });
  });

  describe('useItemCodeGenerator - Missing Package', () => {
    it('should not include package code when packageId is empty', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          packageId: '',
        })
      );

      expect(result.current.generatedCode).toBe('OB-TAB-500-PHA-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Kemasan');
    });
  });

  describe('useItemCodeGenerator - Missing Dosage', () => {
    it('should not include dosage code when dosageId is empty', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          dosageId: '',
        })
      );

      expect(result.current.generatedCode).toBe('OB-TAB-STR-PHA-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Sediaan');
    });
  });

  describe('useItemCodeGenerator - Missing Manufacturer', () => {
    it('should not include manufacturer code when manufacturerId is empty', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          manufacturerId: '',
        })
      );

      expect(result.current.generatedCode).toBe('OB-TAB-STR-500-...');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Produsen');
    });
  });

  describe('useItemCodeGenerator - Multiple Missing Fields', () => {
    it('should handle multiple missing fields', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categoryId: '',
          typeId: '',
          packageId: '',
        })
      );

      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toHaveLength(3);
      expect(result.current.missingFields).toContain('Kategori');
      expect(result.current.missingFields).toContain('Jenis');
      expect(result.current.missingFields).toContain('Kemasan');
    });

    it('should generate partial code with some fields present', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categoryId: '',
          typeId: '',
          packageId: '',
        })
      );

      expect(result.current.generatedCode).toBe('500-PHA-...');
      expect(result.current.missingFields).toHaveLength(3);
    });
  });

  describe('useItemCodeGenerator - All Missing Fields', () => {
    it('should generate empty code when all fields are missing', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categoryId: '',
          typeId: '',
          packageId: '',
          dosageId: '',
          manufacturerId: '',
        })
      );

      expect(result.current.generatedCode).toBe('');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toHaveLength(5);
    });
  });

  describe('useItemCodeGenerator - Missing Code in Dropdown', () => {
    it('should treat missing code as missing field even with valid id', () => {
      const categoriesWithoutCode: DropdownOption[] = [
        { id: 'cat-1', name: 'Obat' },
      ];

      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categories: categoriesWithoutCode,
        })
      );

      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toContain('Kategori');
      expect(result.current.generatedCode).toContain('TAB-STR-500-PHA');
    });
  });

  describe('useItemCodeGenerator - Empty Dropdowns', () => {
    it('should handle empty dropdown arrays', () => {
      const { result } = renderHook(() =>
        useItemCodeGenerator({
          ...defaultProps,
          categories: [],
          types: [],
          packages: [],
          dosages: [],
          manufacturers: [],
        })
      );

      expect(result.current.generatedCode).toBe('');
      expect(result.current.isComplete).toBe(false);
      expect(result.current.missingFields).toHaveLength(5);
    });
  });

  describe('generateItemCodeWithSequence', () => {
    it('should generate sequence code starting from 000', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue([]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-000');
      expect(mockCheckFn).toHaveBeenCalledWith('OB-TAB-STR-500-PHA-%');
    });

    it('should increment sequence when codes exist', async () => {
      const mockCheckFn = vi
        .fn()
        .mockResolvedValue([
          'OB-TAB-STR-500-PHA-000',
          'OB-TAB-STR-500-PHA-001',
        ]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-002');
    });

    it('should find gaps in sequence numbers', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue([
        'OB-TAB-STR-500-PHA-000',
        'OB-TAB-STR-500-PHA-001',
        'OB-TAB-STR-500-PHA-003', // Gap at 002
        'OB-TAB-STR-500-PHA-004',
      ]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-002');
    });

    it('should handle unsorted input codes', async () => {
      const mockCheckFn = vi
        .fn()
        .mockResolvedValue([
          'OB-TAB-STR-500-PHA-003',
          'OB-TAB-STR-500-PHA-000',
          'OB-TAB-STR-500-PHA-002',
          'OB-TAB-STR-500-PHA-001',
        ]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-004');
    });

    it('should pad sequence number with leading zeros', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue([]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      const parts = result.split('-');
      const sequenceNum = parts[parts.length - 1];

      expect(sequenceNum).toBe('000');
      expect(sequenceNum).toHaveLength(3);
    });

    it('should handle sequence numbers with wrong format', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue([
        'OB-TAB-STR-500-PHA-ABC', // Non-numeric, should be filtered
        'OB-TAB-STR-500-PHA-000',
        'OB-TAB-STR-500-PHA-001',
      ]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-002');
    });

    it('should handle large sequence numbers', async () => {
      const mockCheckFn = vi
        .fn()
        .mockResolvedValue([
          'OB-TAB-STR-500-PHA-000',
          'OB-TAB-STR-500-PHA-001',
          'OB-TAB-STR-500-PHA-998',
          'OB-TAB-STR-500-PHA-999',
        ]);

      const result = await generateItemCodeWithSequence(
        'OB-TAB-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-TAB-STR-500-PHA-002');
    });

    it('should handle codes with multi-part patterns', async () => {
      const mockCheckFn = vi
        .fn()
        .mockResolvedValue(['A-B-C-D-E-000', 'A-B-C-D-E-001']);

      const result = await generateItemCodeWithSequence(
        'A-B-C-D-E',
        mockCheckFn
      );

      expect(result).toBe('A-B-C-D-E-002');
    });

    it('should extract sequence number from last part only', async () => {
      const mockCheckFn = vi.fn().mockResolvedValue([
        'OB-123-STR-500-PHA-000', // Multiple numbers in code
        'OB-123-STR-500-PHA-001',
      ]);

      const result = await generateItemCodeWithSequence(
        'OB-123-STR-500-PHA',
        mockCheckFn
      );

      expect(result).toBe('OB-123-STR-500-PHA-002');
    });
  });
});
