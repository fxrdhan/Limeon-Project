import { describe, expect, it } from 'vite-plus/test';
import { formatItemDisplayName, formatMeasurementSuffix } from './item-display';

describe('item display formatting', () => {
  it('formats numerator-only measurement suffixes', () => {
    expect(
      formatMeasurementSuffix({
        measurement_unit: {
          id: 'unit-mg',
          code: 'mg',
          name: 'Miligram',
        },
        measurement_value: 500,
        name: 'Paracetamol',
      })
    ).toBe('500 mg');
  });

  it('formats percentage measurements without a space before the unit', () => {
    expect(
      formatMeasurementSuffix({
        measurement_unit: {
          id: 'unit-percent',
          code: '%',
          name: 'Persen',
        },
        measurement_value: 70,
        name: 'Alkohol',
      })
    ).toBe('70%');
  });

  it('formats denominator measurements and appends them to item names', () => {
    const item = {
      measurement_denominator_unit: {
        id: 'unit-ml',
        code: 'mL',
        name: 'Mililiter',
      },
      measurement_denominator_value: 5,
      measurement_unit: {
        id: 'unit-mg',
        code: 'mg',
        name: 'Miligram',
      },
      measurement_value: 125,
      name: 'Sirup',
    };

    expect(formatMeasurementSuffix(item)).toBe('125 mg/5 mL');
    expect(formatItemDisplayName(item)).toBe('Sirup 125 mg/5 mL');
  });

  it('omits suffixes when measurement data is incomplete', () => {
    expect(
      formatItemDisplayName({
        measurement_unit: null,
        measurement_value: 500,
        name: 'Tablet',
      })
    ).toBe('Tablet');
  });
});
