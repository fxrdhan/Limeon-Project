import { describe, expect, it } from 'vite-plus/test';
import { filterAndSortOptions, getDropdownOptionScore } from './dropdownUtils';

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
});
