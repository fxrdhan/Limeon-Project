/**
 * Form Validation Tests (Optimized)
 *
 * Consolidated tests with reduced redundancy while maintaining coverage
 */

import { describe, it, expect } from 'vitest';
import type { FormData } from '@/types';
import {
  validateRequiredFields,
  validatePriceFields,
  validateStockFields,
  validateTextFields,
  validateBarcode,
  validateMedicineFields,
  validateFormData,
  validateFormSubmission,
} from './formValidation';

describe('Form Validation', () => {
  const baseFormData: FormData = {
    name: 'Test Item',
    code: 'ITM001',
    barcode: '1234567890123',
    category_id: 'cat-1',
    type_id: 'type-1',
    unit_id: 'unit-1',
    package_id: 'pkg-1',
    dosage_id: 'dosage-1',
    manufacturer_id: 'mfr-1',
    base_price: 10000,
    sell_price: 12000,
    min_stock: 10,
    quantity: 0,
    is_active: true,
    is_medicine: true,
    has_expiry_date: true,
    description: 'Test description',
  };

  describe('validateRequiredFields', () => {
    it('should pass for valid required fields', () => {
      const result = validateRequiredFields(baseFormData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    // Parameterized test for empty/whitespace validation (name only uses simple check)
    it('should fail when name is empty or whitespace', () => {
      const emptyData = { ...baseFormData, name: '' };
      const whitespaceData = { ...baseFormData, name: '   ' };

      expect(validateRequiredFields(emptyData).errors.name).toBe(
        'Nama item wajib diisi'
      );
      expect(validateRequiredFields(whitespaceData).errors.name).toBe(
        'Nama item wajib diisi'
      );
    });

    // Other required fields
    describe.each([
      { field: 'category_id', error: 'Kategori wajib dipilih' },
      { field: 'type_id', error: 'Jenis item wajib dipilih' },
      { field: 'unit_id', error: 'Kemasan wajib dipilih' },
    ])('validates $field is required', ({ field, error }) => {
      it(`should fail when ${field} is missing`, () => {
        const data = { ...baseFormData, [field]: '' };
        expect(validateRequiredFields(data).errors[field]).toBe(error);
      });
    });

    it('should accumulate multiple errors', () => {
      const data = {
        ...baseFormData,
        name: '',
        category_id: '',
        type_id: '',
      };
      const result = validateRequiredFields(data);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(3);
    });
  });

  describe('validatePriceFields', () => {
    it('should pass for valid prices', () => {
      const result = validatePriceFields(baseFormData);
      expect(result.isValid).toBe(true);
    });

    // Consolidated price validation tests
    it.each([
      { price: 0, field: 'base_price', error: 'Harga beli harus lebih dari 0' },
      {
        price: -100,
        field: 'base_price',
        error: 'Harga beli harus lebih dari 0',
      },
      {
        price: -100,
        field: 'sell_price',
        error: 'Harga jual tidak boleh negatif',
      },
    ])('should fail for invalid $field: $price', ({ price, field, error }) => {
      const data = { ...baseFormData, [field]: price };
      const result = validatePriceFields(data);
      expect(result.errors[field]).toBe(error);
    });

    // Margin warning tests (consolidated)
    it.each([
      { base: 10000, sell: 8000, warning: 'sangat rendah' },
      { base: 10000, sell: 10300, warning: 'sangat rendah' },
      { base: 10000, sell: 35000, warning: 'sangat tinggi' },
    ])('should warn for extreme margins', ({ base, sell, warning }) => {
      const data = { ...baseFormData, base_price: base, sell_price: sell };
      const result = validatePriceFields(data);
      expect(result.warnings.sell_price).toContain(warning);
    });

    it('should not warn for normal margins (10-100%)', () => {
      const testCases = [
        { base: 10000, sell: 11000 },
        { base: 10000, sell: 15000 },
        { base: 10000, sell: 20000 },
      ];

      testCases.forEach(({ base, sell }) => {
        const data = { ...baseFormData, base_price: base, sell_price: sell };
        expect(validatePriceFields(data).warnings.sell_price).toBeUndefined();
      });
    });
  });

  describe('validateStockFields', () => {
    it('should pass for valid stock values', () => {
      expect(validateStockFields(baseFormData).isValid).toBe(true);
    });

    it('should fail when min_stock is negative', () => {
      const data = { ...baseFormData, min_stock: -5 };
      expect(validateStockFields(data).errors.min_stock).toBe(
        'Stok minimum tidak boleh negatif'
      );
    });

    it('should warn when min_stock is zero', () => {
      const data = { ...baseFormData, min_stock: 0 };
      expect(validateStockFields(data).warnings.min_stock).toBeDefined();
    });
  });

  describe('validateTextFields', () => {
    it('should pass for valid text fields', () => {
      expect(validateTextFields(baseFormData).isValid).toBe(true);
    });

    // Consolidated length validation tests
    it.each([
      {
        field: 'name',
        value: 'a'.repeat(256),
        error: 'tidak boleh lebih dari 255',
      },
      {
        field: 'description',
        value: 'a'.repeat(501),
        error: 'tidak boleh lebih dari 500',
      },
      {
        field: 'code',
        value: 'a'.repeat(21),
        error: 'tidak boleh lebih dari 20',
      },
    ])(
      'should fail when $field exceeds length limit',
      ({ field, value, error }) => {
        const data = { ...baseFormData, [field]: value };
        const result = validateTextFields(data);
        expect(result.errors[field]).toContain(error);
      }
    );

    it('should warn when name is too short (<3 chars)', () => {
      const data = { ...baseFormData, name: 'ab' };
      expect(validateTextFields(data).warnings.name).toContain('sangat pendek');
    });

    it('should fail when dosage_id is missing', () => {
      const data = { ...baseFormData, dosage_id: '' };
      expect(validateTextFields(data).errors.dosage_id).toBe(
        'Sediaan harus diisi'
      );
    });
  });

  describe('validateBarcode', () => {
    it('should pass for valid and empty barcodes', () => {
      expect(validateBarcode('1234567890123').isValid).toBe(true);
      expect(validateBarcode('').isValid).toBe(true);
    });

    it('should pass for alphanumeric with allowed special chars', () => {
      const validBarcodes = ['ABC123', 'ABC-123', 'ABC_123', 'ABC.123'];
      validBarcodes.forEach(barcode => {
        expect(validateBarcode(barcode).isValid).toBe(true);
      });
    });

    it('should fail for invalid characters', () => {
      const invalidBarcodes = ['ABC@123', 'ABC#123', 'ABC 123'];
      invalidBarcodes.forEach(barcode => {
        expect(validateBarcode(barcode).isValid).toBe(false);
      });
    });

    it.each([
      { barcode: '12345', expectation: 'warn' },
      { barcode: '1'.repeat(31), expectation: 'error' },
    ])(
      'should $expectation for length: $barcode',
      ({ barcode, expectation }) => {
        const result = validateBarcode(barcode);
        if (expectation === 'error') {
          expect(result.isValid).toBe(false);
        } else {
          expect(result.warnings.barcode).toBeDefined();
        }
      }
    );
  });

  describe('validateMedicineFields', () => {
    it('should pass for non-medicine items', () => {
      const data = { ...baseFormData, is_medicine: false };
      expect(validateMedicineFields(data).warnings).toEqual({});
    });

    it('should warn when medicine has no expiry tracking', () => {
      const data = {
        ...baseFormData,
        is_medicine: true,
        has_expiry_date: false,
      };
      expect(validateMedicineFields(data).warnings.has_expiry_date).toContain(
        'kadaluarsa'
      );
    });

    it('should pass when medicine has expiry tracking', () => {
      const data = {
        ...baseFormData,
        is_medicine: true,
        has_expiry_date: true,
      };
      expect(validateMedicineFields(data).warnings).toEqual({});
    });
  });

  describe('validateFormData - Integration', () => {
    it('should pass comprehensive validation for valid form', () => {
      const result = validateFormData(baseFormData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should collect errors from all validation functions', () => {
      const invalidData = {
        ...baseFormData,
        name: '',
        base_price: 0,
        min_stock: -5,
        description: 'a'.repeat(501),
        barcode: 'invalid@barcode',
      };

      const result = validateFormData(invalidData);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(3);
    });

    it('should collect warnings without failing validation', () => {
      const dataWithWarnings = {
        ...baseFormData,
        sell_price: 8000,
        min_stock: 0,
        name: 'ab',
        is_medicine: true,
        has_expiry_date: false,
      };

      const result = validateFormData(dataWithWarnings);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.warnings).length).toBeGreaterThan(0);
    });
  });

  describe('validateFormSubmission', () => {
    it('should pass for complete submission-ready form', () => {
      expect(validateFormSubmission(baseFormData).isValid).toBe(true);
    });

    it('should combine all validation errors including code check', () => {
      const invalidData = {
        ...baseFormData,
        code: '',
        name: '',
        base_price: 0,
      };

      const result = validateFormSubmission(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.code).toBe('Kode item belum digenerate');
      expect(Object.keys(result.errors).length).toBeGreaterThan(2);
    });
  });

  describe('Real-world scenarios', () => {
    it('Scenario: Generic medicine validation', () => {
      const genericMedicine: FormData = {
        name: 'Paracetamol 500mg',
        code: 'MED001',
        barcode: '8992761001234',
        category_id: 'cat-medicine',
        type_id: 'type-generic',
        unit_id: 'unit-strip',
        package_id: 'pkg-strip',
        dosage_id: 'dosage-tablet',
        manufacturer_id: 'mfr-generik',
        base_price: 1500,
        sell_price: 1800,
        min_stock: 50,
        quantity: 0,
        is_active: true,
        is_medicine: true,
        has_expiry_date: true,
        description: 'Obat penurun panas dan pereda nyeri',
      };

      const result = validateFormData(genericMedicine);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('Scenario: Validation catches multiple user mistakes', () => {
      const userMistakes: FormData = {
        name: '',
        code: '',
        barcode: '',
        category_id: '',
        type_id: 'type-1',
        unit_id: '',
        package_id: '',
        dosage_id: '',
        manufacturer_id: 'mfr-1',
        base_price: 0,
        sell_price: -100,
        min_stock: -5,
        quantity: 0,
        is_active: true,
        is_medicine: true,
        has_expiry_date: false,
        description: '',
      };

      const formResult = validateFormData(userMistakes);
      const submissionResult = validateFormSubmission(userMistakes);

      expect(formResult.isValid).toBe(false);
      expect(submissionResult.isValid).toBe(false);
      expect(Object.keys(formResult.errors).length).toBeGreaterThan(5);
      expect(formResult.warnings.has_expiry_date).toBeDefined();
    });

    it('Scenario: Extreme pricing strategies (loss-leader & luxury)', () => {
      // Loss-leader
      const lossLeader = {
        ...baseFormData,
        base_price: 25000,
        sell_price: 25500,
      };
      const lossResult = validatePriceFields(lossLeader);
      expect(lossResult.warnings.sell_price).toContain('sangat rendah');

      // Luxury product
      const luxury = {
        ...baseFormData,
        base_price: 500000,
        sell_price: 1750000,
      };
      const luxuryResult = validatePriceFields(luxury);
      expect(luxuryResult.warnings.sell_price).toContain('sangat tinggi');
    });
  });
});
