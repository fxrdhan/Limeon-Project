import { describe, expect, it } from 'vite-plus/test';
import type { PackageConversion } from '../../../shared/types';
import type { ItemInventoryUnit } from '../../../../../types/database';
import {
  getFilteredAvailablePackageConversionUnits,
  getPackageConversionBaseUnitOption,
  getPackageConversionExistingUnitOptions,
  getUniquePackageConversions,
  isPackageConversionAgFloatingLayerTarget,
  parsePackageConversionCurrencyValue,
  resolvePackageConversionParentUnitName,
  shouldEndPackageConversionInteraction,
} from './helpers';

const unit = (
  id: string,
  overrides: Partial<ItemInventoryUnit> = {}
): ItemInventoryUnit => ({
  id,
  name: id,
  kind: 'packaging',
  ...overrides,
});

const conversion = (
  unitId: string,
  overrides: Partial<PackageConversion> = {}
): PackageConversion => ({
  id: `conversion-${unitId}`,
  unit_name: unitId,
  to_unit_id: unitId,
  inventory_unit_id: unitId,
  parent_inventory_unit_id: null,
  unit: unit(unitId),
  conversion_rate: 1,
  base_price: 0,
  sell_price: 0,
  ...overrides,
});

describe('item package conversion form helpers', () => {
  it('parses editable currency values into non-negative numbers', () => {
    expect(parsePackageConversionCurrencyValue(12_500)).toBe(12_500);
    expect(parsePackageConversionCurrencyValue(-25)).toBe(0);
    expect(parsePackageConversionCurrencyValue('Rp 12.500')).toBe(12_500);
    expect(parsePackageConversionCurrencyValue('abc')).toBe(0);
    expect(parsePackageConversionCurrencyValue(null)).toBe(0);
  });

  it('filters out the base unit and already selected conversion units', () => {
    const availableUnits = [unit('tablet'), unit('strip'), unit('box')];

    expect(
      getFilteredAvailablePackageConversionUnits({
        availableUnits,
        baseUnitId: 'tablet',
        conversions: [conversion('strip')],
      }).map(({ id }) => id)
    ).toEqual(['box']);
  });

  it('keeps the first conversion for each unit id', () => {
    const conversions = [
      conversion('strip', { id: 'first-strip' }),
      conversion('box'),
      conversion('strip', { id: 'second-strip' }),
    ];

    expect(
      getUniquePackageConversions(conversions).map(({ id }) => id)
    ).toEqual(['first-strip', 'conversion-box']);
  });

  it('resolves parent unit labels from base unit, conversions, and available units', () => {
    const conversions = [
      conversion('strip', {
        unit: unit('strip', { name: 'Strip' }),
      }),
    ];
    const availableUnits = [unit('box', { name: 'Dus' })];

    expect(
      resolvePackageConversionParentUnitName({
        parentInventoryUnitId: null,
        baseUnit: 'Tablet',
        baseUnitId: 'tablet',
        availableUnits,
        conversions,
      })
    ).toBe('Tablet');
    expect(
      resolvePackageConversionParentUnitName({
        parentInventoryUnitId: 'strip',
        baseUnit: 'Tablet',
        baseUnitId: 'tablet',
        availableUnits,
        conversions,
      })
    ).toBe('Strip');
    expect(
      resolvePackageConversionParentUnitName({
        parentInventoryUnitId: 'box',
        baseUnit: 'Tablet',
        baseUnitId: 'tablet',
        availableUnits,
        conversions,
      })
    ).toBe('Dus');
  });

  it('maps base and existing units into combobox options', () => {
    const baseUnitOption = getPackageConversionBaseUnitOption({
      baseUnit: 'Tablet',
      baseUnitId: 'tablet',
      availableUnits: [
        unit('tablet', {
          code: 'TAB',
          description: 'Primary tablet unit',
          updated_at: '2026-01-01',
        }),
      ],
    });
    const existingOptions = getPackageConversionExistingUnitOptions([
      conversion('strip', {
        unit: unit('strip', {
          code: 'STR',
          description: 'Strip unit',
          updated_at: '2026-01-02',
        }),
      }),
    ]);

    expect(baseUnitOption).toMatchObject({
      id: 'tablet',
      name: 'Tablet',
      code: 'TAB',
      description: 'Primary tablet unit',
      updated_at: '2026-01-01',
    });
    expect(existingOptions).toEqual([
      {
        id: 'strip',
        name: 'strip',
        code: 'STR',
        description: 'Strip unit',
        updated_at: '2026-01-02',
        metaLabel: 'Kemasan',
      },
    ]);
  });

  it('detects AG Grid floating layer targets during blur handling', () => {
    const popup = document.createElement('div');
    popup.className = 'ag-popup';
    const popupChild = document.createElement('button');
    popup.appendChild(popupChild);

    expect(isPackageConversionAgFloatingLayerTarget(popupChild)).toBe(true);
    expect(isPackageConversionAgFloatingLayerTarget(document.body)).toBe(false);
    expect(isPackageConversionAgFloatingLayerTarget(null)).toBe(false);
  });

  it('keeps package conversion interaction active for section and AG Grid popup targets', () => {
    const section = document.createElement('section');
    const field = document.createElement('input');
    section.appendChild(field);

    const outside = document.createElement('button');
    const popup = document.createElement('div');
    popup.className = 'ag-menu';
    const popupButton = document.createElement('button');
    popup.appendChild(popupButton);

    expect(
      shouldEndPackageConversionInteraction({
        activeElement: document.body,
        nextTarget: field,
        sectionElement: section,
      })
    ).toBe(false);
    expect(
      shouldEndPackageConversionInteraction({
        activeElement: popupButton,
        nextTarget: outside,
        sectionElement: section,
      })
    ).toBe(false);
    expect(
      shouldEndPackageConversionInteraction({
        activeElement: document.body,
        nextTarget: popupButton,
        sectionElement: section,
      })
    ).toBe(false);
    expect(
      shouldEndPackageConversionInteraction({
        activeElement: document.body,
        nextTarget: outside,
        sectionElement: section,
      })
    ).toBe(true);
  });
});
