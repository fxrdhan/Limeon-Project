import { describe, expect, it } from 'vite-plus/test';
import { formatItemDisplayName } from './item-display';
import { parseDisplayNameToMeasurement } from './item-measurement-parser';

const units = [
  { id: 'unit-mg', code: 'mg', name: 'MILLIGRAM' },
  { id: 'unit-mcg', code: 'mcg', name: 'MICROGRAM' },
  { id: 'unit-ng', code: 'ng', name: 'NANOGRAM' },
  { id: 'unit-ml', code: 'mL', name: 'MILLILITER' },
  { id: 'unit-ul', code: 'uL', name: 'MICROLITER' },
  { id: 'unit-iu', code: 'IU', name: 'INTERNATIONAL UNITS' },
  { id: 'unit-meq', code: 'mEq', name: 'MILLIEQUIVALENT' },
  { id: 'unit-mmol', code: 'mmol', name: 'MILLIMOLE' },
  { id: 'unit-percent', code: '%', name: 'PERCENT' },
] as const;

describe('item measurement parser', () => {
  it('parses a simple strength suffix from the display name', () => {
    expect(parseDisplayNameToMeasurement('Bio-E 400 IU', [...units])).toEqual({
      displayName: 'Bio-E 400 IU',
      measurementDenominatorUnitId: '',
      measurementDenominatorValue: null,
      measurementUnitId: 'unit-iu',
      measurementValue: 400,
      name: 'Bio-E',
    });
  });

  it('parses ratio strengths into numerator and denominator fields', () => {
    expect(
      parseDisplayNameToMeasurement('Sirup Paracetamol 125 mg/5 mL', [...units])
    ).toEqual({
      displayName: 'Sirup Paracetamol 125 mg/5 mL',
      measurementDenominatorUnitId: 'unit-ml',
      measurementDenominatorValue: 5,
      measurementUnitId: 'unit-mg',
      measurementValue: 125,
      name: 'Sirup Paracetamol',
    });
  });

  it('normalizes common pharmacy aliases for microgram and microliter', () => {
    expect(
      parseDisplayNameToMeasurement('Cyanocobalamin 500 µg/1 µL', [...units])
    ).toEqual({
      displayName: 'Cyanocobalamin 500 µg/1 µL',
      measurementDenominatorUnitId: 'unit-ul',
      measurementDenominatorValue: 1,
      measurementUnitId: 'unit-mcg',
      measurementValue: 500,
      name: 'Cyanocobalamin',
    });
  });

  it('parses clinical chemistry units used in pharmacy products', () => {
    expect(parseDisplayNameToMeasurement('KCl 20 mEq', [...units])).toEqual({
      displayName: 'KCl 20 mEq',
      measurementDenominatorUnitId: '',
      measurementDenominatorValue: null,
      measurementUnitId: 'unit-meq',
      measurementValue: 20,
      name: 'KCl',
    });

    expect(
      parseDisplayNameToMeasurement('Buffer Fosfat 1 mmol/1 mL', [...units])
    ).toEqual({
      displayName: 'Buffer Fosfat 1 mmol/1 mL',
      measurementDenominatorUnitId: 'unit-ml',
      measurementDenominatorValue: 1,
      measurementUnitId: 'unit-mmol',
      measurementValue: 1,
      name: 'Buffer Fosfat',
    });
  });

  it('parses percentage strengths and formats them back without extra spaces', () => {
    const parsed = parseDisplayNameToMeasurement('NaCl 0.9%', [...units]);

    expect(parsed).toEqual({
      displayName: 'NaCl 0.9%',
      measurementDenominatorUnitId: '',
      measurementDenominatorValue: null,
      measurementUnitId: 'unit-percent',
      measurementValue: 0.9,
      name: 'NaCl',
    });

    expect(
      formatItemDisplayName({
        name: parsed.name,
        measurement_value: parsed.measurementValue,
        measurement_unit: units.find(
          unit => unit.id === parsed.measurementUnitId
        ),
      })
    ).toBe('NaCl 0.9%');
  });

  it('leaves non-measurement text untouched', () => {
    expect(
      parseDisplayNameToMeasurement('Amoxicillin BOX 10 STRIP', [...units])
    ).toEqual({
      displayName: 'Amoxicillin BOX 10 STRIP',
      measurementDenominatorUnitId: '',
      measurementDenominatorValue: null,
      measurementUnitId: '',
      measurementValue: null,
      name: 'Amoxicillin BOX 10 STRIP',
    });
  });
});
