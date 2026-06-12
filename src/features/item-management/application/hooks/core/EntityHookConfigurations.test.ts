import { describe, expect, it } from 'vite-plus/test';
import {
  getEntityConfig,
  getEntityTypeForTableName,
  getSupportedEntityTypes,
  isEntityTypeSupported,
} from './EntityHookConfigurations';

describe('EntityHookConfigurations', () => {
  it('returns supported entity types as an isolated list', () => {
    const entityTypes = getSupportedEntityTypes();

    expect(entityTypes).toEqual([
      'categories',
      'types',
      'packages',
      'inventoryUnits',
      'units',
      'dosages',
      'manufacturers',
    ]);

    entityTypes.pop();
    expect(getSupportedEntityTypes()).toHaveLength(7);
  });

  it('resolves entity types from configured table names', () => {
    expect(getEntityTypeForTableName('item_categories')).toBe('categories');
    expect(getEntityTypeForTableName('item_inventory_units')).toBe(
      'inventoryUnits'
    );
    expect(getEntityTypeForTableName('item_manufacturers')).toBe(
      'manufacturers'
    );
    expect(getEntityTypeForTableName('unknown_table')).toBeUndefined();
  });

  it('only treats own registry keys as supported entity types', () => {
    expect(isEntityTypeSupported('categories')).toBe(true);
    expect(isEntityTypeSupported('toString')).toBe(false);
  });

  it('keeps query and mutation configs aligned by entity type', () => {
    const config = getEntityConfig('dosages');

    expect(config.query.tableName).toBe('item_dosages');
    expect(config.mutation.tableName).toBe('item_dosages');
    expect(config.external.dataHookName).toBe('useDosages');
  });
});
