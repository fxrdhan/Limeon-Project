import {
  generateRandomItemData,
  getEntitiesLoadingStatus,
  validateEntitiesForGeneration,
  type RandomItemEntities,
} from './randomItemGenerator';
import { describe, expect, it, vi } from 'vitest';

const entities: RandomItemEntities = {
  categories: [{ id: 'cat-1', code: 'CAT', name: 'Kategori 1' }],
  types: [{ id: 'type-1', code: 'TYP', name: 'Tipe 1' }],
  packages: [{ id: 'pack-1', code: 'PKG', name: 'Kemasan 1' }],
  dosages: [{ id: 'dos-1', code: 'DOS', name: 'Sediaan 1' }],
  manufacturers: [{ id: 'man-1', code: 'MAN', name: 'Produsen 1' }],
};

describe('randomItemGenerator', () => {
  it('validates entity readiness correctly', () => {
    expect(validateEntitiesForGeneration(entities)).toBe(true);

    expect(
      validateEntitiesForGeneration({
        ...entities,
        categories: [],
      })
    ).toBe(false);
  });

  it('throws when entities are incomplete for generation', () => {
    expect(() =>
      generateRandomItemData({
        ...entities,
        dosages: [],
      })
    ).toThrow('Insufficient master data entities for random generation');
  });

  it('generates deterministic random item payload with expected structure', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const generated = generateRandomItemData(entities);

    expect(generated.manufacturer).toBe('Produsen 1');
    expect(generated.itemFormData).toMatchObject({
      name: 'Paracetamol 0mg',
      code: '',
      barcode: '17000000000000',
      base_price: 1000,
      sell_price: 1200,
      min_stock: 10,
      category_id: 'cat-1',
      type_id: 'type-1',
      package_id: 'pack-1',
      dosage_id: 'dos-1',
      manufacturer_id: 'man-1',
      description: '',
      quantity: 0,
      unit_id: 'pack-1',
      is_active: true,
      is_medicine: true,
      has_expiry_date: false,
    });

    randomSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('computes loading status when any entity source is still loading', () => {
    expect(
      getEntitiesLoadingStatus({
        categoriesLoading: false,
        typesLoading: false,
        packagesLoading: false,
        dosagesLoading: false,
        manufacturersLoading: false,
      })
    ).toBe(false);

    expect(
      getEntitiesLoadingStatus({
        categoriesLoading: false,
        typesLoading: true,
        packagesLoading: false,
        dosagesLoading: false,
        manufacturersLoading: false,
      })
    ).toBe(true);
  });
});
