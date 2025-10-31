/**
 * UpdateItem Tests (Optimized)
 *
 * Consolidated validation tests with parameterization
 */

import { describe, it, expect } from 'vitest';
import { validateUpdateItemInput } from './UpdateItem';
import type { UpdateItemInput } from './UpdateItem';

describe('UpdateItem', () => {
  describe('validateUpdateItemInput', () => {
    const validInput: UpdateItemInput = {
      id: 'item-123',
      code: 'ITM001',
      name: 'Test Item',
      manufacturer: 'Test Manufacturer',
      is_medicine: true,
      category_id: 'cat-1',
      type_id: 'type-1',
      unit_id: 'unit-1',
      base_price: 1000,
      sell_price: 1200,
      min_stock: 10,
    };

    it('should pass validation for valid input', () => {
      const result = validateUpdateItemInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // Parameterized empty/whitespace validation
    describe.each([
      { field: 'id', error: 'ID item harus ada untuk update' },
      { field: 'name', error: 'Nama item harus diisi' },
      { field: 'code', error: 'Kode item harus diisi' },
    ])('validates $field is not empty', ({ field, error }) => {
      it.each([
        { value: '', label: 'empty' },
        { value: '   ', label: 'whitespace' },
        { value: undefined, label: 'undefined' },
      ])(`should fail when ${field} is $label`, ({ value }) => {
        const input = { ...validInput, [field]: value };
        const result = validateUpdateItemInput(input);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(error);
      });
    });

    // Parameterized dropdown validation
    it.each([
      { field: 'category_id', error: 'Kategori harus dipilih' },
      { field: 'type_id', error: 'Tipe harus dipilih' },
      { field: 'unit_id', error: 'Unit harus dipilih' },
    ])('should fail when $field is missing', ({ field, error }) => {
      const input = { ...validInput, [field]: '' };
      const result = validateUpdateItemInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(error);
    });

    // Price validation (consolidated)
    it.each([
      { field: 'base_price', value: -100, shouldFail: true },
      { field: 'base_price', value: 0, shouldFail: false },
      { field: 'sell_price', value: -100, shouldFail: true },
      { field: 'sell_price', value: 0, shouldFail: false },
    ])('validates $field with value $value', ({ field, value, shouldFail }) => {
      const input = { ...validInput, [field]: value };
      const result = validateUpdateItemInput(input);
      expect(result.isValid).toBe(!shouldFail);
      if (shouldFail) {
        expect(result.errors).toContain(
          `${field === 'base_price' ? 'Harga beli' : 'Harga jual'} tidak boleh negatif`
        );
      }
    });

    // Stock validation
    it.each([
      { value: -10, shouldFail: true },
      { value: 0, shouldFail: false },
    ])('validates min_stock with value $value', ({ value, shouldFail }) => {
      const input = { ...validInput, min_stock: value };
      const result = validateUpdateItemInput(input);
      expect(result.isValid).toBe(!shouldFail);
      if (shouldFail) {
        expect(result.errors).toContain('Stok minimum tidak boleh negatif');
      }
    });

    // Multiple errors accumulation
    it('should accumulate multiple validation errors', () => {
      const input = {
        ...validInput,
        id: '',
        name: '',
        code: '',
        base_price: -100,
      };
      const result = validateUpdateItemInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });

    // Optional fields (consolidated into one test)
    it('should pass with optional fields present or absent', () => {
      const withOptional = {
        ...validInput,
        barcode: '1234567890',
        rack: 'A-1-1',
        description: 'Test description',
      };
      const withoutOptional = validInput;

      expect(validateUpdateItemInput(withOptional).isValid).toBe(true);
      expect(validateUpdateItemInput(withoutOptional).isValid).toBe(true);
    });

    // Edge cases (consolidated)
    it('should handle edge case values correctly', () => {
      // Large numbers
      const largeNumbers = {
        ...validInput,
        base_price: Number.MAX_SAFE_INTEGER,
        sell_price: Number.MAX_SAFE_INTEGER,
        min_stock: Number.MAX_SAFE_INTEGER,
      };
      expect(validateUpdateItemInput(largeNumbers).isValid).toBe(true);

      // Decimals
      const decimals = {
        ...validInput,
        base_price: 1000.5,
        sell_price: 1200.75,
        min_stock: 10.5,
      };
      expect(validateUpdateItemInput(decimals).isValid).toBe(true);

      // Long strings
      const longStrings = {
        ...validInput,
        name: 'A'.repeat(1000),
        code: 'B'.repeat(1000),
      };
      expect(validateUpdateItemInput(longStrings).isValid).toBe(true);
    });
  });
});
