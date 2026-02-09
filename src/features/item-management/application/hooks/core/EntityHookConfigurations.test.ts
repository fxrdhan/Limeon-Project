import { describe, expect, it } from 'vitest';
import {
  ENTITY_CONFIGURATIONS,
  getEntityConfig,
  getExternalHookConfig,
  getMutationConfig,
  getQueryConfig,
  getSupportedEntityTypes,
  isEntityTypeSupported,
} from './EntityHookConfigurations';

describe('EntityHookConfigurations', () => {
  it('registers all supported entity types', () => {
    expect(getSupportedEntityTypes()).toEqual([
      'categories',
      'types',
      'packages',
      'units',
      'dosages',
      'manufacturers',
    ]);
    expect(isEntityTypeSupported('categories')).toBe(true);
    expect(isEntityTypeSupported('manufacturers')).toBe(true);
    expect(isEntityTypeSupported('invalid-entity')).toBe(false);
  });

  it('returns correct configuration structure for each entity', () => {
    const categories = getEntityConfig('categories');
    expect(categories.query).toMatchObject({
      tableName: 'item_categories',
      orderByField: 'code',
      entityDisplayName: 'kategori',
    });
    expect(categories.mutation).toMatchObject({
      tableName: 'item_categories',
      entityDisplayName: 'kategori',
    });
    expect(categories.external).toMatchObject({
      dataHookName: 'useCategories',
      mutationsHookName: 'useCategoryMutations',
    });

    const types = getEntityConfig('types');
    expect(types.query.tableName).toBe('item_types');
    expect(types.external.dataHookName).toBe('useMedicineTypes');

    const packagesConfig = getEntityConfig('packages');
    expect(packagesConfig.query.tableName).toBe('item_packages');
    expect(packagesConfig.external.mutationsHookName).toBe(
      'usePackageMutations'
    );

    const units = getEntityConfig('units');
    expect(units.query.tableName).toBe('item_units');
    expect(units.external.dataHookName).toBe('useItemUnits');

    const dosages = getEntityConfig('dosages');
    expect(dosages.query.tableName).toBe('item_dosages');
    expect(dosages.external.mutationsHookName).toBe('useDosageMutations');

    const manufacturers = getEntityConfig('manufacturers');
    expect(manufacturers.query).toMatchObject({
      tableName: 'item_manufacturers',
      orderByField: 'name',
      entityDisplayName: 'produsen',
    });
    expect(manufacturers.external.dataHookName).toBe('useManufacturers');

    const allConfigs = [
      categories,
      types,
      packagesConfig,
      units,
      dosages,
      manufacturers,
    ];
    allConfigs.forEach(config => {
      expect(config.query.entityType()).toEqual({});
      expect(config.mutation.createInputType()).toEqual({});
      expect(config.mutation.updateInputType()).toEqual({});
    });
  });

  it('exposes utility getters and throws for unsupported entity type', () => {
    const queryConfig = getQueryConfig('types');
    const mutationConfig = getMutationConfig('types');
    const externalHookConfig = getExternalHookConfig('types');

    expect(queryConfig).toBe(ENTITY_CONFIGURATIONS.types.query);
    expect(mutationConfig).toBe(ENTITY_CONFIGURATIONS.types.mutation);
    expect(externalHookConfig).toBe(ENTITY_CONFIGURATIONS.types.external);

    expect(() => getEntityConfig('unsupported' as never)).toThrowError(
      'Unsupported entity type: unsupported'
    );
  });
});
