import type { Unit } from '@/types/database';

export type ParsedMeasurementInput = {
  displayName: string;
  measurementDenominatorUnitId: string;
  measurementDenominatorValue: number | null;
  measurementUnitId: string;
  measurementValue: number | null;
  name: string;
};

const UNIT_TOKEN =
  '(?:MG|MCG|UG|[\\u00B5\\u03BC]G|NG|G|GM|GR|GRAM|KG|ML|UL|[\\u00B5\\u03BC]L|L|IU|UCI|MEQ|MMOL|GA|GAUGE|%|PERCENT)';

const MEASUREMENT_PATTERN = new RegExp(
  `(?<!\\d)(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_TOKEN})(?:\\s*\\/\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_TOKEN}))?(?=$|\\s|[),.-])`,
  'i'
);

const UNIT_ALIASES: Record<string, string> = {
  '%': '%',
  g: 'g',
  ga: 'GA',
  gauge: 'GA',
  gm: 'g',
  gr: 'g',
  gram: 'g',
  iu: 'IU',
  kg: 'kg',
  l: 'L',
  mcg: 'mcg',
  meq: 'mEq',
  mg: 'mg',
  ml: 'mL',
  mmol: 'mmol',
  ng: 'ng',
  percent: '%',
  uci: 'uCI',
  ug: 'mcg',
  ul: 'uL',
  µg: 'mcg',
  µl: 'uL',
  μg: 'mcg',
  μl: 'uL',
};

const normalizeUnitToken = (value: string) =>
  UNIT_ALIASES[value.trim().toLowerCase()] || '';

const parseNumber = (value: string) =>
  Number.parseFloat(value.replace(',', '.'));

const sanitizeName = (value: string) =>
  value
    .replace(MEASUREMENT_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,./-])/g, '$1')
    .trim();

const findUnitByCode = (units: Unit[], code: string) =>
  units.find(unit => unit.code === code) ||
  units.find(unit => unit.name.toLowerCase() === code.toLowerCase()) ||
  null;

export const parseDisplayNameToMeasurement = (
  rawValue: string,
  units: Unit[]
): ParsedMeasurementInput => {
  const displayName = rawValue.replace(/\s+/g, ' ').trim();
  const match = displayName.match(MEASUREMENT_PATTERN);

  if (!match) {
    return {
      displayName,
      measurementDenominatorUnitId: '',
      measurementDenominatorValue: null,
      measurementUnitId: '',
      measurementValue: null,
      name: displayName,
    };
  }

  const numeratorValue = parseNumber(match[1] || '');
  const numeratorCode = normalizeUnitToken(match[2] || '');
  const denominatorValue = match[3] ? parseNumber(match[3]) : null;
  const denominatorCode = match[4] ? normalizeUnitToken(match[4]) : '';
  const numeratorUnit = numeratorCode
    ? findUnitByCode(units, numeratorCode)
    : null;
  const denominatorUnit =
    denominatorCode && denominatorValue != null
      ? findUnitByCode(units, denominatorCode)
      : null;

  return {
    displayName,
    measurementDenominatorUnitId: denominatorUnit?.id || '',
    measurementDenominatorValue:
      denominatorUnit && Number.isFinite(denominatorValue || NaN)
        ? denominatorValue
        : null,
    measurementUnitId: numeratorUnit?.id || '',
    measurementValue:
      numeratorUnit && Number.isFinite(numeratorValue) ? numeratorValue : null,
    name: sanitizeName(displayName),
  };
};
