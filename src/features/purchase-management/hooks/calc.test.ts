/**
 * Purchase Calculation Tests (Optimized)
 *
 * Consolidated purchase financial calculations with reduced redundancy
 */

import { describe, it, expect } from 'vitest';
import type { PurchaseItem, PurchaseFormData } from '@/types';
import {
  computeItemFinancials,
  recalculateItems,
  calculateSubtotals,
  validatePurchaseItem,
  validatePurchaseForm,
} from './calc';

describe('Purchase Calculations', () => {
  describe('computeItemFinancials', () => {
    const baseItem = {
      quantity: 10,
      price: 1000,
      discount: 0,
      vat_percentage: 0,
    };

    it.each([
      {
        label: 'simple item without VAT',
        item: { ...baseItem },
        vatIncluded: false,
        expected: {
          base: 10000,
          discountAmount: 0,
          afterDiscount: 10000,
          vatAmount: 0,
          subtotal: 10000,
        },
      },
      {
        label: 'with 10% discount',
        item: { ...baseItem, discount: 10 },
        vatIncluded: false,
        expected: {
          base: 10000,
          discountAmount: 1000,
          afterDiscount: 9000,
          vatAmount: 0,
          subtotal: 9000,
        },
      },
      {
        label: '100% discount',
        item: { ...baseItem, discount: 100 },
        vatIncluded: false,
        expected: {
          base: 10000,
          discountAmount: 10000,
          afterDiscount: 0,
          vatAmount: 0,
          subtotal: 0,
        },
      },
    ])('should calculate $label', ({ item, vatIncluded, expected }) => {
      expect(computeItemFinancials(item, vatIncluded)).toEqual(expected);
    });

    describe('VAT calculations', () => {
      it('should add VAT on top when NOT included', () => {
        const item = {
          quantity: 10,
          price: 1000,
          discount: 10,
          vat_percentage: 11,
        };
        const result = computeItemFinancials(item, false);

        expect(result.base).toBe(10000);
        expect(result.afterDiscount).toBe(9000);
        expect(result.vatAmount).toBe(990); // 11% of 9000
        expect(result.subtotal).toBe(9990);
      });

      it('should extract VAT when included in price', () => {
        const item = {
          quantity: 10,
          price: 1110,
          discount: 10,
          vat_percentage: 11,
        };
        const result = computeItemFinancials(item, true);

        expect(result.base).toBe(11100);
        expect(result.afterDiscount).toBe(9990);
        expect(result.vatAmount).toBeCloseTo(990, 0);
        expect(result.subtotal).toBe(9990);
      });

      it('should handle realistic pharmacy purchase (100 units, 5% discount, 11% VAT)', () => {
        const item = {
          quantity: 100,
          price: 50000,
          discount: 5,
          vat_percentage: 11,
        };
        const result = computeItemFinancials(item, false);

        expect(result.base).toBe(5000000);
        expect(result.discountAmount).toBe(250000);
        expect(result.afterDiscount).toBe(4750000);
        expect(result.vatAmount).toBe(522500);
        expect(result.subtotal).toBe(5272500);
      });
    });

    describe('Edge cases', () => {
      it.each([
        { quantity: 0, price: 1000, expected: { base: 0, subtotal: 0 } },
        { quantity: -5, price: -1000, expected: { base: 0, subtotal: 0 } }, // Clamped to 0
        {
          quantity: 10,
          price: 1000,
          discount: 150,
          expected: { afterDiscount: 0 },
        }, // Clamped to 100%
        {
          quantity: 10,
          price: undefined,
          expected: { base: 0, subtotal: 0 },
        }, // Missing price defaults to 0
      ])(
        'should handle edge case: $quantity qty @ $price',
        ({ quantity, price, discount = 0, expected }) => {
          const item = { quantity, price, discount, vat_percentage: 11 };
          const result = computeItemFinancials(item, false);
          Object.entries(expected).forEach(([key, value]) => {
            expect(result[key]).toBe(value);
          });
        }
      );

      it('should handle decimal quantities/prices and round to 2 decimals', () => {
        const item = {
          quantity: 12.5,
          price: 999.99,
          discount: 7.5,
          vat_percentage: 11,
        };
        const result = computeItemFinancials(item, false);

        expect(result.base).toBeCloseTo(12499.88, 2);
        expect(result.subtotal).toBeGreaterThan(0);
      });
    });
  });

  describe('recalculateItems', () => {
    it('should recalculate subtotals and preserve item properties', () => {
      const items: PurchaseItem[] = [
        {
          item: { name: 'Paracetamol', code: 'MED001' },
          id: '1',
          item_id: 'item-1',
          item_name: 'Paracetamol',
          quantity: 100,
          price: 500,
          discount: 5,
          vat_percentage: 11,
          unit: 'Strip',
          unit_conversion_rate: 10,
          subtotal: 0,
          batch_no: 'BATCH123',
          expiry_date: '2025-12-31',
        },
      ];

      const result = recalculateItems(items, false);

      expect(result[0].subtotal).toBeGreaterThan(0);
      expect(result[0].item_name).toBe('Paracetamol');
      expect(result[0].batch_no).toBe('BATCH123');
      expect(result[0].expiry_date).toBe('2025-12-31');
    });

    it('should set defaults for missing optional fields', () => {
      const items: PurchaseItem[] = [
        {
          id: '1',
          item_id: 'item-1',
          item_name: 'Item',
          quantity: 1,
          price: 1000,
          discount: 0,
        } as PurchaseItem,
      ];

      const result = recalculateItems(items, false);
      expect(result[0].vat_percentage).toBe(0);
      expect(result[0].unit).toBe('Unit');
      expect(result[0].unit_conversion_rate).toBe(1);
    });
  });

  describe('calculateSubtotals', () => {
    it('should aggregate subtotals for multiple items', () => {
      const items: PurchaseItem[] = [
        {
          item: { name: 'Item 1', code: 'ITM001' },
          id: '1',
          item_id: 'item-1',
          item_name: 'Item 1',
          quantity: 10,
          price: 1000,
          discount: 0,
          vat_percentage: 11,
          unit: 'Box',
          unit_conversion_rate: 1,
          subtotal: 0,
          batch_no: null,
          expiry_date: null,
        },
        {
          item: { name: 'Item 2', code: 'ITM002' },
          id: '2',
          item_id: 'item-2',
          item_name: 'Item 2',
          quantity: 5,
          price: 2000,
          discount: 10,
          vat_percentage: 11,
          unit: 'Strip',
          unit_conversion_rate: 1,
          subtotal: 0,
          batch_no: null,
          expiry_date: null,
        },
      ];

      const result = calculateSubtotals(items, false);

      expect(result.baseTotal).toBe(20000);
      expect(result.discountTotal).toBe(1000);
      expect(result.afterDiscountTotal).toBe(19000);
      expect(result.vatTotal).toBe(2090);
      expect(result.grandTotal).toBe(21090);
    });

    it('should handle VAT included mode and empty array', () => {
      const items: PurchaseItem[] = [
        {
          item: { name: 'Item', code: 'ITM001' },
          id: '1',
          item_id: 'item-1',
          item_name: 'Item',
          quantity: 10,
          price: 1110,
          discount: 0,
          vat_percentage: 11,
          unit: 'Box',
          unit_conversion_rate: 1,
          subtotal: 0,
          batch_no: null,
          expiry_date: null,
        },
      ];

      const result = calculateSubtotals(items, true);
      expect(result.grandTotal).toBe(11100);

      const emptyResult = calculateSubtotals([], false);
      expect(emptyResult.grandTotal).toBe(0);
    });

    it('should handle realistic bulk purchase (3 items)', () => {
      const items: PurchaseItem[] = [
        {
          item: { name: 'Paracetamol 500mg', code: 'MED001' },
          id: '1',
          item_id: 'med-1',
          item_name: 'Paracetamol 500mg',
          quantity: 500,
          price: 300,
          discount: 5,
          vat_percentage: 11,
          unit: 'Strip',
          unit_conversion_rate: 10,
          subtotal: 0,
          batch_no: 'P202501',
          expiry_date: '2027-01-31',
        },
        {
          item: { name: 'Amoxicillin 500mg', code: 'MED002' },
          id: '2',
          item_id: 'med-2',
          item_name: 'Amoxicillin 500mg',
          quantity: 300,
          price: 800,
          discount: 10,
          vat_percentage: 11,
          unit: 'Strip',
          unit_conversion_rate: 10,
          subtotal: 0,
          batch_no: 'A202501',
          expiry_date: '2026-12-31',
        },
        {
          item: { name: 'Masker N95', code: 'SUP001' },
          id: '3',
          item_id: 'supp-1',
          item_name: 'Masker N95',
          quantity: 1000,
          price: 5000,
          discount: 15,
          vat_percentage: 11,
          unit: 'Box',
          unit_conversion_rate: 50,
          subtotal: 0,
          batch_no: 'M202501',
          expiry_date: null,
        },
      ];

      const result = calculateSubtotals(items, false);

      expect(result.baseTotal).toBe(5390000);
      expect(result.discountTotal).toBe(781500);
      expect(result.afterDiscountTotal).toBe(4608500);
      expect(result.grandTotal).toBeGreaterThan(result.afterDiscountTotal);
    });
  });

  describe('validatePurchaseItem', () => {
    const validItem: PurchaseItem = {
      item: { name: 'Test Item', code: 'TST001' },
      id: '1',
      item_id: 'item-1',
      item_name: 'Test Item',
      quantity: 10,
      price: 1000,
      discount: 10,
      vat_percentage: 11,
      unit: 'Box',
      unit_conversion_rate: 1,
      subtotal: 10000,
      batch_no: 'BATCH123',
      expiry_date: '2025-12-31',
    };

    it('should pass validation for valid item', () => {
      expect(validatePurchaseItem(validItem)).toHaveLength(0);
    });

    it.each([
      { field: 'item_id', value: '', error: 'Item belum dipilih.' },
      { field: 'item_name', value: '   ', error: 'Nama item tidak valid.' },
      { field: 'unit', value: '   ', error: 'Satuan harus diisi.' },
      {
        field: 'quantity',
        value: 0,
        error: 'Kuantitas harus lebih besar dari 0.',
      },
      {
        field: 'quantity',
        value: -5,
        error: 'Kuantitas harus lebih besar dari 0.',
      },
      { field: 'price', value: -100, error: 'Harga tidak boleh negatif.' },
      { field: 'discount', value: -5, error: 'Diskon harus di antara 0–100%.' },
      {
        field: 'discount',
        value: 150,
        error: 'Diskon harus di antara 0–100%.',
      },
      {
        field: 'vat_percentage',
        value: -1,
        error: 'PPN harus di antara 0–100%.',
      },
      {
        field: 'unit_conversion_rate',
        value: 0,
        error: 'Konversi satuan tidak valid.',
      },
    ])('should fail when $field = $value', ({ field, value, error }) => {
      const item = { ...validItem, [field]: value };
      expect(validatePurchaseItem(item)).toContain(error);
    });

    it('should validate expiry_date format and allow null', () => {
      expect(
        validatePurchaseItem({ ...validItem, expiry_date: '31/12/2025' })
      ).toContain('Format tanggal kadaluwarsa harus YYYY-MM-DD.');
      expect(
        validatePurchaseItem({ ...validItem, expiry_date: null })
      ).toHaveLength(0);
    });

    it('should accumulate multiple errors', () => {
      const item = { ...validItem, quantity: 0, price: -100, discount: 150 };
      expect(validatePurchaseItem(item).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validatePurchaseForm', () => {
    const validForm: PurchaseFormData = {
      invoice_number: 'INV-001',
      date: '2025-01-15',
      due_date: '2025-02-15',
      payment_status: 'unpaid',
      payment_method: 'transfer',
      supplier_id: 'supplier-1',
      notes: 'Test purchase',
      vat_percentage: 11,
      is_vat_included: false,
    };

    const validItems: PurchaseItem[] = [
      {
        item: { name: 'Test Item', code: 'ITM001' },
        id: '1',
        item_id: 'item-1',
        item_name: 'Test Item',
        quantity: 10,
        price: 1000,
        discount: 0,
        vat_percentage: 11,
        unit: 'Box',
        unit_conversion_rate: 1,
        subtotal: 11100,
        batch_no: null,
        expiry_date: null,
      },
    ];

    it('should pass validation for valid form and items', () => {
      const result = validatePurchaseForm(validForm, validItems);
      expect(result.isValid).toBe(true);
      expect(result.formErrors).toHaveLength(0);
      expect(result.itemErrors).toHaveLength(0);
    });

    it.each([
      {
        field: 'invoice_number',
        value: '',
        error: 'Nomor faktur wajib diisi.',
      },
      {
        field: 'date',
        value: '15/01/2025',
        error: 'Tanggal faktur tidak valid (YYYY-MM-DD).',
      },
      {
        field: 'due_date',
        value: '2025/02/15',
        error: 'Tanggal jatuh tempo harus YYYY-MM-DD.',
      },
      {
        field: 'payment_status',
        value: '',
        error: 'Status pembayaran wajib diisi.',
      },
      {
        field: 'payment_method',
        value: '',
        error: 'Metode pembayaran wajib diisi.',
      },
    ])('should fail when $field = "$value"', ({ field, value, error }) => {
      const form = { ...validForm, [field]: value };
      const result = validatePurchaseForm(form, validItems);
      expect(result.formErrors).toContain(error);
    });

    it('should fail when items array is empty', () => {
      const result = validatePurchaseForm(validForm, []);
      expect(result.formErrors).toContain(
        'Minimal harus ada satu item pembelian.'
      );
    });

    it('should collect item-level and form-level errors', () => {
      const invalidItems = [{ ...validItems[0], quantity: 0, price: -100 }];
      const invalidForm = { ...validForm, invoice_number: '' };

      const result = validatePurchaseForm(invalidForm, invalidItems);
      expect(result.isValid).toBe(false);
      expect(result.formErrors.length).toBeGreaterThan(0);
      expect(result.itemErrors.length).toBeGreaterThan(0);
    });
  });
});
