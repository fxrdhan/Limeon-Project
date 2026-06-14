import { describe, expect, it } from 'vite-plus/test';
import type { FormData } from '../types';
import {
  validateBarcode,
  validateFormData,
  validateFormSubmission,
  validateMedicineFields,
  validatePriceFields,
  validateRequiredFields,
  validateStockFields,
  validateTextFields,
} from './formValidation';

const formData = (overrides: Partial<FormData> = {}): FormData => ({
  barcode: 'ABC-123456',
  base_price: 1000,
  category_id: 'category-1',
  code: 'ITEM-001',
  description: 'Obat demam',
  dosage_id: 'dosage-1',
  has_expiry_date: true,
  is_active: true,
  is_medicine: true,
  manufacturer_id: 'manufacturer-1',
  min_stock: 10,
  name: 'Paracetamol',
  package_id: 'package-1',
  quantity: 0,
  sell_price: 1200,
  type_id: 'type-1',
  unit_id: 'unit-1',
  ...overrides,
});

describe('form validation utilities', () => {
  it('validates required item identity fields', () => {
    expect(validateRequiredFields(formData()).isValid).toBe(true);

    expect(
      validateRequiredFields(
        formData({
          category_id: '',
          name: ' ',
          type_id: '',
          unit_id: '',
        })
      ).errors
    ).toEqual({
      category_id: 'Kategori wajib dipilih',
      name: 'Nama item wajib diisi',
      type_id: 'Jenis item wajib dipilih',
      unit_id: 'Kemasan wajib dipilih',
    });
  });

  it('validates price errors and margin warnings', () => {
    expect(
      validatePriceFields(
        formData({
          base_price: 0,
          sell_price: -1,
        })
      ).errors
    ).toEqual({
      base_price: 'Harga beli harus lebih dari 0',
      sell_price: 'Harga jual tidak boleh negatif',
    });

    expect(
      validatePriceFields(
        formData({
          base_price: 1000,
          sell_price: 4000,
        })
      ).warnings.sell_price
    ).toBe('Margin sangat tinggi (>200%), periksa kompetitivitas harga');

    expect(
      validatePriceFields(
        formData({
          base_price: 1000,
          sell_price: 1030,
        })
      ).warnings.sell_price
    ).toBe('Margin sangat rendah (<5%), periksa profitabilitas');
  });

  it('validates stock, text, barcode, and medicine-specific fields', () => {
    expect(validateStockFields(formData({ min_stock: -1 })).errors).toEqual({
      min_stock: 'Stok minimum tidak boleh negatif',
    });
    expect(validateStockFields(formData({ min_stock: 0 })).warnings).toEqual({
      min_stock: 'Stok minimum 0 dapat menyebabkan kehabisan stok',
    });

    expect(
      validateTextFields(
        formData({
          code: 'X'.repeat(21),
          description: 'D'.repeat(501),
          dosage_id: '',
          name: 'AB',
        })
      )
    ).toMatchObject({
      errors: {
        code: 'Kode item tidak boleh lebih dari 20 karakter',
        description: 'Deskripsi tidak boleh lebih dari 500 karakter',
        dosage_id: 'Sediaan harus diisi',
      },
      warnings: {
        name: 'Nama item sangat pendek, pertimbangkan nama yang lebih deskriptif',
      },
    });

    expect(validateBarcode('AB*12').errors.barcode).toBe(
      'Barcode hanya boleh mengandung huruf, angka, tanda hubung, titik, dan underscore'
    );
    expect(validateBarcode('ABC').warnings.barcode).toBe(
      'Barcode sangat pendek, pastikan formatnya benar'
    );
    expect(validateBarcode('A'.repeat(31)).errors.barcode).toBe(
      'Barcode tidak boleh lebih dari 30 karakter'
    );

    expect(
      validateMedicineFields(
        formData({
          has_expiry_date: false,
          is_medicine: true,
        })
      ).warnings
    ).toEqual({
      has_expiry_date: 'Obat biasanya memiliki tanggal kadaluarsa',
    });
  });

  it('combines form validation and submission-specific code checks', () => {
    expect(validateFormData(formData()).isValid).toBe(true);

    const submission = validateFormSubmission(
      formData({
        code: '',
        name: '',
      })
    );

    expect(submission.isValid).toBe(false);
    expect(submission.errors).toMatchObject({
      code: 'Kode item belum digenerate',
      name: 'Nama item wajib diisi',
    });
  });
});
