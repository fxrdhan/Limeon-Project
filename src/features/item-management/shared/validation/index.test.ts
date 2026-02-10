import { describe, expect, it } from 'vitest';
import { EntityValidation, VALIDATION_CONFIGS } from './index';

describe('item-management validation rules', () => {
  it('exposes expected validation config defaults', () => {
    expect(VALIDATION_CONFIGS.categories.maxNameLength).toBe(100);
    expect(VALIDATION_CONFIGS.packages.maxNciCodeLength).toBe(20);
    expect(VALIDATION_CONFIGS.manufacturers.maxAddressLength).toBe(500);
    expect(VALIDATION_CONFIGS.units.requiredFields).toEqual(['name']);
  });

  it('validates standard entities (name and description)', () => {
    expect(EntityValidation.categories.validate({})).toContain(
      'Nama kategori wajib diisi'
    );

    const tooLongName = 'x'.repeat(101);
    expect(EntityValidation.types.validate({ name: tooLongName })).toContain(
      'Nama jenis item maksimal 100 karakter'
    );

    const tooLongDescription = 'd'.repeat(501);
    expect(
      EntityValidation.units.validate({
        name: 'Unit A',
        description: tooLongDescription,
      })
    ).toContain('Deskripsi maksimal 500 karakter');

    expect(
      EntityValidation.categories.validate({
        name: 'Kategori A',
        description: 'Valid',
      })
    ).toEqual([]);
  });

  it('validates NCI entities and manufacturer address rules', () => {
    const longNci = 'n'.repeat(21);

    expect(
      EntityValidation.packages.validate({
        name: 'Kemasan',
        nci_code: longNci,
      })
    ).toContain('Kode NCI maksimal 20 karakter');

    expect(
      EntityValidation.dosages.validate({
        name: 'Tablet',
        nci_code: longNci,
      })
    ).toContain('Kode NCI maksimal 20 karakter');

    expect(
      EntityValidation.packages.validate({
        name: 'Kemasan tanpa NCI',
      })
    ).toEqual([]);

    expect(EntityValidation.manufacturers.validate({})).toContain(
      'Nama manufaktur wajib diisi'
    );

    const longAddress = 'a'.repeat(501);
    expect(
      EntityValidation.manufacturers.validate({
        name: 'Produsen A',
        address: longAddress,
      })
    ).toContain('Alamat maksimal 500 karakter');

    expect(
      EntityValidation.manufacturers.validate({
        name: 'Produsen A',
        address: 'Jakarta',
      })
    ).toEqual([]);

    expect(
      EntityValidation.manufacturers.validate({
        name: 'x'.repeat(101),
      })
    ).toContain('Nama manufaktur maksimal 100 karakter');
  });
});
