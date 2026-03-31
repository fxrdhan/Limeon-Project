import type { UnitData } from '@/types/database';

type MeasurementShape = {
  display_name?: string;
  measurement_denominator_unit?: UnitData | null;
  measurement_denominator_value?: number | null;
  measurement_unit?: UnitData | null;
  measurement_value?: number | null;
  name: string;
};

const formatMeasurementNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(value);

const resolveUnitLabel = (unit?: UnitData | null) =>
  unit?.code || unit?.name || '';

export const formatMeasurementSuffix = (item: MeasurementShape) => {
  if (item.measurement_value == null || !item.measurement_unit) {
    return '';
  }

  const numeratorUnit = resolveUnitLabel(item.measurement_unit);

  if (!numeratorUnit) {
    return '';
  }

  const numerator = `${formatMeasurementNumber(item.measurement_value)} ${numeratorUnit}`;

  if (
    item.measurement_denominator_value == null ||
    !item.measurement_denominator_unit
  ) {
    return numerator;
  }

  const denominatorUnit = resolveUnitLabel(item.measurement_denominator_unit);

  if (!denominatorUnit) {
    return numerator;
  }

  return `${numerator}/${formatMeasurementNumber(item.measurement_denominator_value)} ${denominatorUnit}`;
};

export const formatItemDisplayName = (item: MeasurementShape) => {
  const suffix = formatMeasurementSuffix(item);
  return suffix ? `${item.name} ${suffix}` : item.name;
};
