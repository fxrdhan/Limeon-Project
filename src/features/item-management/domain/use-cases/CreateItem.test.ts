import { describe, it, expect } from 'vitest';
import { validateCreateItemInput } from './CreateItem';
import type { CreateItemInput } from './CreateItem';

describe('CreateItem', () => {
  describe('validateCreateItemInput', () => {
    const validInput: CreateItemInput = {
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
      const result = validateCreateItemInput(validInput);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const input = { ...validInput, name: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nama item harus diisi');
    });

    it('should fail when code is empty', () => {
      const input = { ...validInput, code: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Kode item harus diisi');
    });

    it('should fail when category_id is missing', () => {
      const input = { ...validInput, category_id: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Kategori harus dipilih');
    });

    it('should fail when type_id is missing', () => {
      const input = { ...validInput, type_id: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tipe harus dipilih');
    });

    it('should fail when unit_id is missing', () => {
      const input = { ...validInput, unit_id: '' };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unit harus dipilih');
    });

    it('should fail when base_price is negative', () => {
      const input = { ...validInput, base_price: -100 };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Harga beli tidak boleh negatif');
    });

    it('should fail when sell_price is negative', () => {
      const input = { ...validInput, sell_price: -100 };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Harga jual tidak boleh negatif');
    });

    it('should fail when min_stock is negative', () => {
      const input = { ...validInput, min_stock: -10 };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stok minimum tidak boleh negatif');
    });

    it('should accumulate multiple validation errors', () => {
      const input = {
        ...validInput,
        name: '',
        code: '',
        base_price: -100,
      };
      const result = validateCreateItemInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
