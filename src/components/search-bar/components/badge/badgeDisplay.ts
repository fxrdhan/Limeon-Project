import type { BadgeConfig } from '../../types/badge';

export const BADGE_TYPE_LABELS: Record<BadgeConfig['type'], string> = {
  column: 'Column',
  operator: 'Operator',
  value: 'Value',
  separator: 'Separator',
  valueTo: 'End value',
  join: 'Join',
  groupOpen: 'Open group',
  groupClose: 'Close group',
};

export const formatCurrencyDisplay = (value: string): string => {
  const cleanValue = value
    .replace(/^(Rp\.?\s*|\$\s*|€\s*|¥\s*|£\s*|IDR\s*|USD\s*|EUR\s*)/i, '')
    .replace(/[.,]/g, '')
    .trim();

  if (cleanValue.includes(' ')) {
    return value;
  }

  const numericValue = parseInt(cleanValue, 10);

  if (isNaN(numericValue)) {
    return value;
  }

  return `Rp ${numericValue.toLocaleString('id-ID')}`;
};
