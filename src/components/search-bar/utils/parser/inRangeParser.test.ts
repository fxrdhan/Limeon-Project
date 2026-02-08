import { describe, expect, it } from 'vitest';
import { parseInRangeValues } from './inRangeParser';

describe('inRangeParser', () => {
  it('parses #to marker format', () => {
    expect(parseInRangeValues('500 #to 700')).toEqual({
      value: '500',
      valueTo: '700',
    });
  });

  it('parses dash format only when confirmed', () => {
    expect(parseInRangeValues('500-700', true)).toEqual({
      value: '500',
      valueTo: '700',
    });
    expect(parseInRangeValues('500-700', false)).toBeNull();
  });

  it('returns null on incomplete and invalid patterns', () => {
    expect(parseInRangeValues('500 #to ')).toBeNull();
    expect(parseInRangeValues(' - 700', true)).toBeNull();
    expect(parseInRangeValues('500')).toBeNull();
  });
});
