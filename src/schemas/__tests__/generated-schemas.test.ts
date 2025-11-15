import { describe, it, expect } from 'vitest';
import {
  CategorySchema,
  PatientSchema,
  SupplierSchema,
  FormDataSchema,
} from '../generated';

describe('Generated Zod Schemas', () => {
  describe('CategorySchema', () => {
    it('should validate a valid category', () => {
      const validCategory = {
        id: '123',
        code: 'CAT001',
        name: 'Antibiotik',
        description: 'Kategori antibiotik',
      };

      const result = CategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const invalidCategory = {
        id: 123, // should be string
        name: 'Antibiotik',
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const minimalCategory = {
        id: '123',
        name: 'Antibiotik',
      };

      const result = CategorySchema.safeParse(minimalCategory);
      expect(result.success).toBe(true);
    });
  });

  describe('FormDataSchema', () => {
    it('should validate a complete form data', () => {
      const validFormData = {
        code: 'ITEM001',
        name: 'Paracetamol 500mg',
        manufacturer_id: 'mfr-123',
        type_id: 'type-123',
        category_id: 'cat-123',
        package_id: 'pkg-123',
        dosage_id: 'dos-123',
        barcode: '1234567890123',
        description: 'Obat penurun panas',
        base_price: 5000,
        sell_price: 7000,
        min_stock: 10,
        quantity: 100,
        unit_id: 'unit-123',
        is_active: true,
        is_medicine: true,
        has_expiry_date: true,
      };

      const result = FormDataSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    it('should reject form data with wrong types', () => {
      const invalidFormData = {
        code: 'ITEM001',
        name: 'Paracetamol 500mg',
        base_price: '5000', // should be number
        sell_price: 7000,
        // ... other fields
      };

      const result = FormDataSchema.safeParse(invalidFormData);
      expect(result.success).toBe(false);
    });
  });

  describe('PatientSchema', () => {
    it('should validate patient with optional fields', () => {
      const validPatient = {
        id: 'patient-123',
        name: 'John Doe',
        gender: 'L',
        birth_date: '1990-01-01',
        phone: '081234567890',
      };

      const result = PatientSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should validate minimal patient data', () => {
      const minimalPatient = {
        id: 'patient-123',
        name: 'John Doe',
      };

      const result = PatientSchema.safeParse(minimalPatient);
      expect(result.success).toBe(true);
    });
  });

  describe('SupplierSchema', () => {
    it('should validate supplier data', () => {
      const validSupplier = {
        id: 'sup-123',
        name: 'PT Kimia Farma',
        address: 'Jakarta',
        phone: '021-12345678',
        email: 'contact@kimiafarma.com',
      };

      const result = SupplierSchema.safeParse(validSupplier);
      expect(result.success).toBe(true);
    });
  });
});
