import { describe, expect, it } from 'vite-plus/test';
import {
  filterAndSortOptions,
  getDropdownOptionMatchRanges,
  getDropdownOptionScore,
} from './dropdownUtils';

describe('dropdownUtils', () => {
  it('prioritizes token prefix matches above incidental substrings', () => {
    const options = [
      { id: 'inj-foam', name: 'INJECTABLE FOAM' },
      { id: 'inj-lipo', name: 'INJECTABLE, LIPOSOMAL' },
      { id: 'pellet', name: 'PELLET, IMPLANTABLE' },
      { id: 'tablet', name: 'TABLET' },
      { id: 'tablet-sensor', name: 'TABLET WITH SENSOR' },
      { id: 'tablet-chew', name: 'TABLET, CHEWABLE' },
    ];

    const results = filterAndSortOptions(options, 'table');

    expect(results.map(option => option.name).slice(0, 4)).toEqual([
      'TABLET',
      'TABLET, CHEWABLE',
      'TABLET WITH SENSOR',
      'INJECTABLE FOAM',
    ]);
  });

  it('gives the strongest score to exact and leading matches', () => {
    expect(
      getDropdownOptionScore({ id: 'tablet', name: 'TABLET' }, 'tablet')
    ).toBeGreaterThan(
      getDropdownOptionScore({ id: 'inj', name: 'INJECTABLE' }, 'tablet')
    );

    expect(
      getDropdownOptionScore({ id: 'tablet', name: 'TABLET' }, 'table')
    ).toBeGreaterThan(
      getDropdownOptionScore({ id: 'inj', name: 'INJECTABLE' }, 'table')
    );
  });

  it('groups fuzzy matched characters into display ranges', () => {
    expect(getDropdownOptionMatchRanges('Antiacne', 'aacne')).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 8 },
    ]);

    expect(getDropdownOptionMatchRanges('Oftalmologi', 'oft')).toEqual([
      { start: 0, end: 3 },
    ]);
  });
});
