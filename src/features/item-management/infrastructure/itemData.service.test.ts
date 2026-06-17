import { describe, expect, it } from 'vite-plus/test';
import {
  normalizeCreatedItemResponse,
  normalizeCustomerLevelDiscounts,
  normalizeItemCodeRows,
  normalizeItemInventoryUnit,
  normalizeItemInventoryUnits,
} from './itemData.service';

describe('item data service normalization', () => {
  it('normalizes created item ids from insert responses', () => {
    expect(normalizeCreatedItemResponse({ id: ' item-1 ' })).toEqual({
      id: 'item-1',
    });
  });

  it('rejects malformed created item responses', () => {
    expect(normalizeCreatedItemResponse({ id: null })).toBeNull();
    expect(normalizeCreatedItemResponse({ id: '' })).toBeNull();
    expect(normalizeCreatedItemResponse(null)).toBeNull();
  });

  it('normalizes customer level discount rows', () => {
    expect(
      normalizeCustomerLevelDiscounts([
        {
          customer_level_id: 'level-1',
          discount_percentage: '12.5',
        },
        {
          customer_level_id: null,
          discount_percentage: 10,
        },
      ])
    ).toEqual([
      {
        customer_level_id: 'level-1',
        discount_percentage: 12.5,
      },
    ]);
  });

  it('normalizes item code rows', () => {
    expect(
      normalizeItemCodeRows([
        { code: 'ITEM-001' },
        { code: null },
        { code: 42 },
      ])
    ).toEqual([{ code: 'ITEM-001' }, { code: null }]);
  });

  it('normalizes item inventory unit rows', () => {
    expect(
      normalizeItemInventoryUnit({
        id: 'unit-1',
        code: 'TAB',
        name: 'Tablet',
        kind: 'retail_unit',
        source_package_id: null,
        source_dosage_id: 'dosage-1',
        description: 'Satuan tablet',
        created_at: '2026-06-15T00:00:00.000Z',
        updated_at: null,
      })
    ).toEqual({
      id: 'unit-1',
      code: 'TAB',
      name: 'Tablet',
      kind: 'retail_unit',
      source_package_id: null,
      source_dosage_id: 'dosage-1',
      description: 'Satuan tablet',
      created_at: '2026-06-15T00:00:00.000Z',
      updated_at: null,
    });
  });

  it('drops malformed item inventory unit rows', () => {
    expect(
      normalizeItemInventoryUnits([
        {
          id: 'unit-1',
          name: 'Box',
          kind: 'packaging',
        },
        {
          id: 'unit-2',
          name: 'Broken',
          kind: 'invalid',
        },
      ])
    ).toEqual([
      {
        id: 'unit-1',
        code: undefined,
        name: 'Box',
        kind: 'packaging',
        source_package_id: null,
        source_dosage_id: null,
        description: null,
        created_at: undefined,
        updated_at: null,
      },
    ]);
  });
});
