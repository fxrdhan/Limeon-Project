import type { FormData } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

/**
 * Validates required fields for item form
 */
export const validateRequiredFields = (
  formData: FormData
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Required field validations
  if (!formData.name?.trim()) {
    errors.name = 'Nama item wajib diisi';
  }

  if (!formData.category_id) {
    errors.category_id = 'Kategori wajib dipilih';
  }

  if (!formData.type_id) {
    errors.type_id = 'Jenis item wajib dipilih';
  }

  if (!formData.unit_id) {
    errors.unit_id = 'Satuan wajib dipilih';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates price fields
 */
export const validatePriceFields = (formData: FormData): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Price validations
  if (formData.base_price <= 0) {
    errors.base_price = 'Harga beli harus lebih dari 0';
  }

  if (formData.sell_price < 0) {
    errors.sell_price = 'Harga jual tidak boleh negatif';
  }

  if (formData.sell_price < formData.base_price) {
    warnings.sell_price = 'Harga jual lebih rendah dari harga beli';
  }

  // Extreme margin warnings
  if (formData.base_price > 0 && formData.sell_price > 0) {
    const margin =
      ((formData.sell_price - formData.base_price) / formData.base_price) * 100;

    if (margin > 200) {
      warnings.sell_price =
        'Margin sangat tinggi (>200%), periksa kompetitivitas harga';
    } else if (margin < 5) {
      warnings.sell_price =
        'Margin sangat rendah (<5%), periksa profitabilitas';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates stock fields
 */
export const validateStockFields = (formData: FormData): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (formData.min_stock < 0) {
    errors.min_stock = 'Stok minimum tidak boleh negatif';
  }

  if (formData.min_stock === 0) {
    warnings.min_stock = 'Stok minimum 0 dapat menyebabkan kehabisan stok';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates text fields
 */
export const validateTextFields = (formData: FormData): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Name validation
  if (formData.name && formData.name.length > 255) {
    errors.name = 'Nama item tidak boleh lebih dari 255 karakter';
  }

  if (formData.name && formData.name.length < 3) {
    warnings.name =
      'Nama item sangat pendek, pertimbangkan nama yang lebih deskriptif';
  }

  // Manufacturer validation
  // No validation needed for manufacturer_id as it's a UUID selected from dropdown

  // Description validation
  if (formData.description && formData.description.length > 500) {
    errors.description = 'Deskripsi tidak boleh lebih dari 500 karakter';
  }

  // Dosage validation
  if (!formData.dosage_id) {
    errors.dosage_id = 'Sediaan harus diisi';
  }

  // Code validation
  if (formData.code && formData.code.length > 20) {
    errors.code = 'Kode item tidak boleh lebih dari 20 karakter';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates barcode format
 */
export const validateBarcode = (barcode: string): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!barcode) {
    return { isValid: true, errors, warnings };
  }

  // Basic barcode format validation
  const barcodeRegex = /^[0-9A-Za-z\-_.]+$/;
  if (!barcodeRegex.test(barcode)) {
    errors.barcode =
      'Barcode hanya boleh mengandung huruf, angka, tanda hubung, titik, dan underscore';
  }

  if (barcode.length < 6) {
    warnings.barcode = 'Barcode sangat pendek, pastikan formatnya benar';
  }

  if (barcode.length > 30) {
    errors.barcode = 'Barcode tidak boleh lebih dari 30 karakter';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Validates medicine-specific fields
 */
export const validateMedicineFields = (
  formData: FormData
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!formData.is_medicine) {
    return { isValid: true, errors, warnings };
  }

  // Medicine-specific validations can be added here
  // For example: expiry date requirements, batch tracking, etc.

  if (formData.is_medicine && !formData.has_expiry_date) {
    warnings.has_expiry_date = 'Obat biasanya memiliki tanggal kadaluarsa';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

/**
 * Comprehensive form validation
 */
export const validateFormData = (formData: FormData): ValidationResult => {
  const validations = [
    validateRequiredFields(formData),
    validatePriceFields(formData),
    validateStockFields(formData),
    validateTextFields(formData),
    validateBarcode(formData.barcode || ''),
    validateMedicineFields(formData),
  ];

  const combinedErrors: Record<string, string> = {};
  const combinedWarnings: Record<string, string> = {};

  validations.forEach(validation => {
    Object.assign(combinedErrors, validation.errors);
    Object.assign(combinedWarnings, validation.warnings);
  });

  return {
    isValid: Object.keys(combinedErrors).length === 0,
    errors: combinedErrors,
    warnings: combinedWarnings,
  };
};

/**
 * Validates form submission readiness
 */
export const validateFormSubmission = (
  formData: FormData
): ValidationResult => {
  const validation = validateFormData(formData);

  // Additional submission-specific validations
  if (!formData.code) {
    validation.errors.code = 'Kode item belum digenerate';
  }

  return validation;
};
