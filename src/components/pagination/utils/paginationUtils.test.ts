import { describe, expect, it } from 'vitest';
import { paginationUtils } from './paginationUtils';

describe('paginationUtils', () => {
  it('calculates total pages with valid and invalid page-size values', () => {
    expect(paginationUtils.calculateTotalPages(100, 10)).toBe(10);
    expect(paginationUtils.calculateTotalPages(101, 10)).toBe(11);
    expect(paginationUtils.calculateTotalPages(100, 0)).toBe(0);
    expect(paginationUtils.calculateTotalPages(100, -5)).toBe(0);
  });

  it('computes item range and offset for current page', () => {
    expect(paginationUtils.calculateItemRange(3, 20)).toEqual({
      start: 41,
      end: 60,
    });
    expect(paginationUtils.calculateOffset(3, 20)).toBe(40);
  });

  it('validates and clamps page numbers', () => {
    expect(paginationUtils.isValidPage(1, 5)).toBe(true);
    expect(paginationUtils.isValidPage(0, 5)).toBe(false);
    expect(paginationUtils.isValidPage(6, 5)).toBe(false);

    expect(paginationUtils.clampPage(0, 5)).toBe(1);
    expect(paginationUtils.clampPage(3, 5)).toBe(3);
    expect(paginationUtils.clampPage(99, 5)).toBe(5);
  });
});
