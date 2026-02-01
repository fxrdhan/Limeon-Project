import { describe, it, expect } from 'vitest';
import { ItemTransformer } from './ItemTransformer';
import type { DBItemWithRelations } from '../repositories/ItemRepository';

describe('ItemTransformer', () => {
  it('parses package conversions', () => {
    expect(ItemTransformer.parsePackageConversions(null)).toEqual([]);
    expect(
      ItemTransformer.parsePackageConversions('[{"unit_name":"box"}]')
    ).toEqual([{ unit_name: 'box' }]);
    expect(ItemTransformer.parsePackageConversions('bad')).toEqual([]);
    expect(
      ItemTransformer.parsePackageConversions([{ unit_name: 'unit' }])
    ).toEqual([{ unit_name: 'unit' }]);
    expect(
      ItemTransformer.parsePackageConversions(123 as unknown as string)
    ).toEqual([]);
  });

  it('gets manufacturer info', () => {
    expect(
      ItemTransformer.getManufacturerInfo({ id: 'm1', name: 'M', code: 'C' })
    ).toEqual({ id: 'm1', name: 'M', code: 'C' });
    expect(ItemTransformer.getManufacturerInfo(null)).toEqual({
      id: '',
      name: '',
      code: undefined,
    });
  });

  it('transforms DB item to UI item', () => {
    const dbItem: DBItemWithRelations = {
      id: '1',
      name: 'Item',
      base_price: 10,
      sell_price: 15,
      stock: 5,
      package_conversions: '[]',
      item_categories: { id: 'c1', name: 'Cat' },
      item_types: { id: 't1', name: 'Type' },
      item_packages: { id: 'p1', name: 'Pack' },
      item_dosages: { id: 'd1', name: 'Dos' },
      item_manufacturers: { id: 'm1', name: 'Man' },
      customer_level_discounts: [
        { customer_level_id: 'lvl1', discount_percentage: 5 },
      ],
      base_unit: 'pcs',
      image_urls: ['a'],
    };

    const result = ItemTransformer.transformDBItemToItem(dbItem);
    expect(result.category?.name).toBe('Cat');
    expect(result.manufacturer?.id).toBe('m1');
    expect(result.customer_level_discounts?.[0].discount_percentage).toBe(5);

    const arrayResult = ItemTransformer.transformDBItemsToItems([dbItem]);
    expect(arrayResult).toHaveLength(1);
  });

  it('fills defaults when DB fields are missing', () => {
    const dbItem: DBItemWithRelations = {
      id: '2',
      name: 'Item',
      base_price: 10,
      sell_price: 15,
      stock: 5,
      package_conversions: [],
      item_categories: null,
      item_types: null,
      item_packages: null,
      item_dosages: null,
      item_manufacturers: null,
      customer_level_discounts: [
        {
          customer_level_id: 'lvl1',
          discount_percentage: '7' as unknown as number,
        },
      ],
      base_unit: undefined,
      image_urls: null,
      is_level_pricing_active: undefined,
    };

    const result = ItemTransformer.transformDBItemToItem(dbItem);
    expect(result.category?.name).toBe('');
    expect(result.type?.name).toBe('');
    expect(result.package?.name).toBe('');
    expect(result.dosage?.name).toBe('');
    expect(result.unit?.name).toBe('');
    expect(result.base_unit).toBe('');
    expect(result.image_urls).toEqual([]);
    expect(result.is_level_pricing_active).toBe(true);
    expect(result.customer_level_discounts?.[0].discount_percentage).toBe(7);
  });

  it('handles zero discounts and update without conversions', () => {
    const dbItem: DBItemWithRelations = {
      id: '4',
      name: 'Item',
      base_price: 10,
      sell_price: 15,
      stock: 5,
      package_conversions: '[]',
      item_categories: null,
      item_types: null,
      item_packages: null,
      item_dosages: null,
      item_manufacturers: null,
      customer_level_discounts: [
        { customer_level_id: 'lvl1', discount_percentage: 0 },
      ],
      base_unit: 'pcs',
      image_urls: [],
    };

    const result = ItemTransformer.transformDBItemToItem(dbItem);
    expect(result.customer_level_discounts?.[0].discount_percentage).toBe(0);

    const updated = ItemTransformer.transformItemUpdateToDBItem({
      name: 'Item',
    });
    expect(updated.package_conversions).toBeUndefined();
  });

  it('handles non-array discounts and explicit level pricing flag', () => {
    const dbItem: DBItemWithRelations = {
      id: '3',
      name: 'Item',
      base_price: 10,
      sell_price: 15,
      stock: 5,
      package_conversions: '[]',
      item_categories: null,
      item_types: null,
      item_packages: null,
      item_dosages: null,
      item_manufacturers: null,
      customer_level_discounts: null,
      base_unit: 'pcs',
      image_urls: [],
      is_level_pricing_active: false,
    };

    const result = ItemTransformer.transformDBItemToItem(dbItem);
    expect(result.customer_level_discounts).toEqual([]);
    expect(result.is_level_pricing_active).toBe(false);
  });

  it('transforms item to DB format', () => {
    const created = ItemTransformer.transformItemToDBItem({
      name: 'Item',
      code: 'C',
      stock: 1,
      base_price: 1,
      sell_price: 2,
      category_id: 'c',
      type_id: 't',
      package_id: 'p',
      unit_id: 'u',
      dosage_id: 'd',
      manufacturer_id: 'm',
      is_level_pricing_active: true,
      customer_level_discounts: [],
    });

    expect(created.package_conversions).toBe('[]');

    const createdWithConversions = ItemTransformer.transformItemToDBItem(
      {
        name: 'Item',
        code: 'C',
        stock: 1,
        base_price: 1,
        sell_price: 2,
        category_id: 'c',
        type_id: 't',
        package_id: 'p',
        unit_id: 'u',
        dosage_id: 'd',
        manufacturer_id: 'm',
        is_level_pricing_active: true,
        customer_level_discounts: [],
      },
      [{ unit_name: 'box' } as never]
    );

    expect(createdWithConversions.package_conversions).toBe(
      '[{"unit_name":"box"}]'
    );

    const updated = ItemTransformer.transformItemUpdateToDBItem(
      { name: 'Item' },
      [{ unit_name: 'box' }]
    );
    expect(updated.package_conversions).toBe('[{"unit_name":"box"}]');
  });

  it('validates item data', () => {
    const validation = ItemTransformer.validateItemData({ name: '', code: '' });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);

    const ok = ItemTransformer.validateItemData({
      name: 'Item',
      code: 'C',
      stock: 1,
    });
    expect(ok.isValid).toBe(true);

    const negative = ItemTransformer.validateItemData({
      name: 'Item',
      code: 'C',
      stock: -1,
    });
    expect(negative.errors).toContain('Stock cannot be negative');
  });

  it('creates empty item template', () => {
    const empty = ItemTransformer.createEmptyItem();
    expect(empty.name).toBe('');
    expect(empty.package_conversions).toEqual([]);
  });

  it('extracts searchable fields', () => {
    const fields = ItemTransformer.extractSearchableFields({
      name: 'Item',
      code: 'C',
      barcode: 'B',
      manufacturer: { name: 'Man' },
      category: { name: 'Cat' },
      type: { name: 'Type' },
    } as never);

    expect(fields).toContain('Item');
    expect(fields).toContain('Man');

    const emptyFields = ItemTransformer.extractSearchableFields({
      name: '',
      code: '',
      barcode: '',
      manufacturer: { name: '' },
      category: { name: '' },
      type: { name: '' },
    } as never);
    expect(emptyFields).toEqual([]);
  });

  it('formats stock display with conversions', () => {
    expect(ItemTransformer.calculateTotalUnits(5, [])).toBe(5);

    const formatted = ItemTransformer.formatStockDisplay(
      25,
      [
        { unit_name: 'box', conversion_rate: 10 } as never,
        { unit_name: 'pack' } as never,
      ],
      'pcs'
    );

    expect(formatted).toContain('box');

    const empty = ItemTransformer.formatStockDisplay(0, [], 'pcs');
    expect(empty).toBe('0 pcs');

    const fallbackRates = ItemTransformer.formatStockDisplay(
      5,
      [{ unit_name: 'box' } as never, { unit_name: 'pack' } as never],
      'pcs'
    );
    expect(fallbackRates).toContain('box');
  });

  it('calculates total units and formats stock display', () => {
    expect(ItemTransformer.calculateTotalUnits(10, [])).toBe(10);
    expect(
      ItemTransformer.calculateTotalUnits(10, [
        { conversion_rate: 5 },
        { conversion_rate: 2 },
      ])
    ).toBe(50);

    expect(
      ItemTransformer.calculateTotalUnits(10, [{ conversion_rate: undefined }])
    ).toBe(10);

    expect(ItemTransformer.formatStockDisplay(5, [], 'pcs')).toBe('5 pcs');

    const formatted = ItemTransformer.formatStockDisplay(
      12,
      [
        { unit_name: 'box', conversion_rate: 10 },
        { unit_name: 'strip', conversion_rate: 2 },
      ],
      'pcs'
    );
    expect(formatted).toContain('box');

    const sortedOutput = ItemTransformer.formatStockDisplay(
      12,
      [
        { unit_name: 'strip', conversion_rate: 2 },
        { unit_name: 'box', conversion_rate: 10 },
      ],
      'pcs'
    );
    expect(sortedOutput.split(', ')[0]).toContain('box');

    const withRemainder = ItemTransformer.formatStockDisplay(
      11,
      [{ unit_name: 'box', conversion_rate: 10 }],
      'pcs'
    );
    expect(withRemainder).toContain('1 pcs');

    const withDefaultRate = ItemTransformer.formatStockDisplay(
      1,
      [{ unit_name: 'box', conversion_rate: undefined }],
      'pcs'
    );
    expect(withDefaultRate).toContain('1 box');

    const zeroStock = ItemTransformer.formatStockDisplay(
      0,
      [{ unit_name: 'box', conversion_rate: 10 }],
      'pcs'
    );
    expect(zeroStock).toBe('0 pcs');
  });
});
