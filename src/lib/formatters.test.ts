import { describe, expect, it } from 'vite-plus/test';
import {
  extractNumericValue,
  formatDateOnlyDisplayValue,
  formatDateOnlyValue,
  formatPercentage,
  formatRupiah,
  parseDateOnlyValue,
} from './formatters';

describe('formatters', () => {
  it('formats currency, percentages, and numeric input values', () => {
    expect(formatRupiah(1500)).toBe('Rp\u00a01.500');
    expect(formatPercentage(12.5)).toBe('12.5%');
    expect(extractNumericValue('Rp 12.500,00')).toBe(1250000);
    expect(extractNumericValue('abc')).toBe(0);
  });

  it('round-trips date-only values without relying on UTC midnight', () => {
    const parsedDate = parseDateOnlyValue('2026-06-13');

    expect(formatDateOnlyValue(parsedDate)).toBe('2026-06-13');
    expect(parsedDate.getHours()).toBe(12);
    expect(
      formatDateOnlyDisplayValue(
        '2026-06-13',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        },
        'id-ID'
      )
    ).toBe('13 Juni 2026');
  });

  it('rejects malformed or impossible date-only values', () => {
    expect(() => parseDateOnlyValue('2026/06/13')).toThrow(
      'Expected a date-only value in YYYY-MM-DD format.'
    );
    expect(() => parseDateOnlyValue('2026-02-30')).toThrow(
      'Expected a valid date-only value.'
    );
  });
});
