import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  filterAndSortOptions,
  getDropdownOptionScore,
  getSearchIconColor,
} from './dropdownUtils';

const fuzzyMatchMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/search', () => ({
  fuzzyMatch: fuzzyMatchMock,
}));

describe('dropdownUtils', () => {
  beforeEach(() => {
    fuzzyMatchMock.mockReset();
  });

  it('scores options by direct match, fuzzy match, and no match', () => {
    fuzzyMatchMock.mockImplementation((value: string, term: string) => {
      return value === 'Amox' && term === 'amx';
    });

    expect(
      getDropdownOptionScore({ id: '1', name: 'Paracetamol' }, 'para')
    ).toBe(3);
    expect(getDropdownOptionScore({ id: '2', name: 'Amox' }, 'amx')).toBe(1);
    expect(getDropdownOptionScore({ id: '3', name: 'Vitamin C' }, 'abc')).toBe(
      0
    );
  });

  it('filters and sorts options by score then alphabetically', () => {
    fuzzyMatchMock.mockImplementation((value: string, term: string) => {
      return (
        (value === 'Amoxicillin' && term === 'amx') ||
        (value === 'Ampoule' && term === 'amx')
      );
    });

    const options = [
      { id: '1', name: 'Paracetamol' },
      { id: '2', name: 'Amoxicillin' },
      { id: '3', name: 'Ampoule' },
      { id: '4', name: 'Cetirizine' },
    ];

    expect(filterAndSortOptions(options, 'para')).toEqual([
      { id: '1', name: 'Paracetamol' },
    ]);

    expect(filterAndSortOptions(options, 'amx')).toEqual([
      { id: '2', name: 'Amoxicillin' },
      { id: '3', name: 'Ampoule' },
    ]);
  });

  it('returns icon color per state with default fallback', () => {
    expect(getSearchIconColor('idle')).toBe('text-slate-400');
    expect(getSearchIconColor('typing')).toBe('text-slate-800');
    expect(getSearchIconColor('found')).toBe('text-primary');
    expect(getSearchIconColor('not-found')).toBe('text-primary');
    expect(getSearchIconColor('unknown')).toBe('text-slate-400');
  });
});
