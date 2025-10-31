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

    describe('ID Validation', () => {
      it('should fail when id is empty string', () => {
        const input = { ...validInput, id: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID item harus ada untuk update');
      });

      it('should fail when id is only whitespace', () => {
        const input = { ...validInput, id: '   ' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID item harus ada untuk update');
      });

      it('should fail when id is undefined', () => {
        const input = { ...validInput, id: undefined as any };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('ID item harus ada untuk update');
      });
    });

    describe('Name Validation', () => {
      it('should fail when name is empty', () => {
        const input = { ...validInput, name: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Nama item harus diisi');
      });

      it('should fail when name is only whitespace', () => {
        const input = { ...validInput, name: '   ' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Nama item harus diisi');
      });
    });

    describe('Code Validation', () => {
      it('should fail when code is empty', () => {
        const input = { ...validInput, code: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Kode item harus diisi');
      });

      it('should fail when code is only whitespace', () => {
        const input = { ...validInput, code: '   ' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Kode item harus diisi');
      });
    });

    describe('Category Validation', () => {
      it('should fail when category_id is missing', () => {
        const input = { ...validInput, category_id: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Kategori harus dipilih');
      });
    });

    describe('Type Validation', () => {
      it('should fail when type_id is missing', () => {
        const input = { ...validInput, type_id: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Tipe harus dipilih');
      });
    });

    describe('Unit Validation', () => {
      it('should fail when unit_id is missing', () => {
        const input = { ...validInput, unit_id: '' };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Unit harus dipilih');
      });
    });

    describe('Price Validation', () => {
      it('should fail when base_price is negative', () => {
        const input = { ...validInput, base_price: -100 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Harga beli tidak boleh negatif');
      });

      it('should pass when base_price is zero', () => {
        const input = { ...validInput, base_price: 0 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should fail when sell_price is negative', () => {
        const input = { ...validInput, sell_price: -100 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Harga jual tidak boleh negatif');
      });

      it('should pass when sell_price is zero', () => {
        const input = { ...validInput, sell_price: 0 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Minimum Stock Validation', () => {
      it('should fail when min_stock is negative', () => {
        const input = { ...validInput, min_stock: -10 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Stok minimum tidak boleh negatif');
      });

      it('should pass when min_stock is zero', () => {
        const input = { ...validInput, min_stock: 0 };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Multiple Errors', () => {
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
        expect(result.errors).toContain('ID item harus ada untuk update');
        expect(result.errors).toContain('Nama item harus diisi');
        expect(result.errors).toContain('Kode item harus diisi');
        expect(result.errors).toContain('Harga beli tidak boleh negatif');
      });

      it('should handle all fields invalid at once', () => {
        const input = {
          id: '',
          code: '',
          name: '',
          manufacturer: '',
          is_medicine: false,
          category_id: '',
          type_id: '',
          unit_id: '',
          base_price: -1000,
          sell_price: -1200,
          min_stock: -50,
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Optional Fields', () => {
      it('should pass with optional barcode field', () => {
        const input = {
          ...validInput,
          barcode: '1234567890',
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should pass without optional barcode field', () => {
        const input = validInput;
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should pass with optional rack field', () => {
        const input = {
          ...validInput,
          rack: 'A-1-1',
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should pass with optional description field', () => {
        const input = {
          ...validInput,
          description: 'Test description',
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large numbers', () => {
        const input = {
          ...validInput,
          base_price: Number.MAX_SAFE_INTEGER,
          sell_price: Number.MAX_SAFE_INTEGER,
          min_stock: Number.MAX_SAFE_INTEGER,
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should handle decimal prices', () => {
        const input = {
          ...validInput,
          base_price: 1000.5,
          sell_price: 1200.75,
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should validate decimal min_stock', () => {
        const input = {
          ...validInput,
          min_stock: 10.5,
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });

      it('should handle very long strings', () => {
        const longString = 'A'.repeat(1000);
        const input = {
          ...validInput,
          name: longString,
          code: longString,
        };
        const result = validateUpdateItemInput(input);

        expect(result.isValid).toBe(true);
      });
    });
  });
});
