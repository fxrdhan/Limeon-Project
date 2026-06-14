import { describe, expect, it } from 'vite-plus/test';
import {
  getPercentageBackspaceValue,
  getPercentageInputValue,
} from './purchaseItemsGridInput';

describe('purchase item grid percentage inputs', () => {
  it('parses formatted percentage input to a bounded number', () => {
    expect(getPercentageInputValue('12%')).toBe(12);
    expect(getPercentageInputValue('VAT 15%')).toBe(15);
    expect(getPercentageInputValue('150%', 100)).toBe(100);
  });

  it('falls back to zero for empty or non-numeric percentage input', () => {
    expect(getPercentageInputValue('')).toBe(0);
    expect(getPercentageInputValue('%')).toBe(0);
    expect(getPercentageInputValue('abc')).toBe(0);
  });

  it('truncates the rightmost percentage digit on terminal backspace', () => {
    expect(
      getPercentageBackspaceValue({
        currentValue: 75,
        inputLength: 3,
        key: 'Backspace',
        selectionStart: 3,
      })
    ).toBe(7);
  });

  it('leaves percentage backspace handling to the input otherwise', () => {
    expect(
      getPercentageBackspaceValue({
        currentValue: 75,
        inputLength: 3,
        key: 'Delete',
        selectionStart: 3,
      })
    ).toBeNull();
    expect(
      getPercentageBackspaceValue({
        currentValue: 75,
        inputLength: 3,
        key: 'Backspace',
        selectionStart: 1,
      })
    ).toBeNull();
    expect(
      getPercentageBackspaceValue({
        currentValue: 0,
        inputLength: 2,
        key: 'Backspace',
        selectionStart: 2,
      })
    ).toBeNull();
  });
});
