import { describe, expect, it } from 'vite-plus/test';
import {
  areDBPackageConversionValuesEqual,
  normalizeDBPackageConversions,
  normalizePackageConversions,
  parseDBPackageConversionValue,
} from './packageConversions';

describe('package conversion normalization', () => {
  it('normalizes db conversions from a JSON payload', () => {
    const result = parseDBPackageConversionValue(
      JSON.stringify([
        {
          id: 'conversion-strip',
          unit_name: 'Strip',
          to_unit_id: 'strip',
          conversion_rate: '10',
          base_price: '12500',
          sell_price: '15000',
        },
      ])
    );

    expect(result).toEqual([
      {
        id: 'conversion-strip',
        unit_name: 'Strip',
        to_unit_id: 'strip',
        conversion_rate: 10,
        base_price: 12500,
        sell_price: 15000,
      },
    ]);
  });

  it('returns null for malformed package conversion sources', () => {
    expect(parseDBPackageConversionValue('not-json')).toBeNull();
    expect(parseDBPackageConversionValue({ unit_name: 'Strip' })).toBeNull();
    expect(parseDBPackageConversionValue([{ unit_name: 'Strip' }])).toBeNull();
  });

  it('keeps explicit empty conversion lists empty', () => {
    expect(parseDBPackageConversionValue(null)).toEqual([]);
    expect(parseDBPackageConversionValue('[]')).toEqual([]);
    expect(parseDBPackageConversionValue([])).toEqual([]);
  });

  it('drops malformed rows while keeping valid conversions', () => {
    const result = normalizeDBPackageConversions([
      12,
      { unit_name: 'Strip' },
      { unit_name: 'Box', to_unit_id: 'box', conversion_rate: 100 },
    ]);

    expect(result).toEqual([
      {
        id: 'box',
        unit_name: 'Box',
        to_unit_id: 'box',
        conversion_rate: 100,
      },
    ]);
  });

  it('normalizes legacy package conversions into form-safe objects', () => {
    const result = normalizePackageConversions([
      {
        id: 'box-row',
        unit: { id: 'box', name: 'Box', kind: 'packaging' },
        factor_to_base: '100',
        base_price: '20000',
      },
    ]);

    expect(result).toEqual([
      {
        id: 'box-row',
        unit_name: 'Box',
        to_unit_id: 'box',
        inventory_unit_id: 'box',
        parent_inventory_unit_id: null,
        contains_quantity: 100,
        factor_to_base: 100,
        conversion_rate: 100,
        base_price_override: null,
        sell_price_override: null,
        unit: {
          id: 'box',
          code: undefined,
          name: 'Box',
          kind: 'packaging',
          source_package_id: null,
          source_dosage_id: null,
          description: null,
        },
        base_price: 20000,
        sell_price: 0,
      },
    ]);
  });

  it('compares string and array db conversion values after normalization', () => {
    expect(
      areDBPackageConversionValuesEqual(
        '[{"unit_name":"Strip","to_unit_id":"strip","conversion_rate":"10"}]',
        [{ unit_name: 'Strip', to_unit_id: 'strip', conversion_rate: 10 }]
      )
    ).toBe(true);
  });
});
