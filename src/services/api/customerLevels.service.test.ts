import { describe, expect, it } from 'vite-plus/test';
import {
  normalizeCustomerLevel,
  normalizeCustomerLevels,
} from './customerLevels.service';

describe('customer level normalization', () => {
  it('normalizes customer level percentage values', () => {
    expect(
      normalizeCustomerLevel({
        id: 'level-1',
        level_name: 'Level 1',
        price_percentage: '95',
        description: null,
      })
    ).toEqual({
      id: 'level-1',
      level_name: 'Level 1',
      price_percentage: 95,
      description: null,
    });
  });

  it('drops malformed customer level rows', () => {
    expect(
      normalizeCustomerLevels([
        {
          id: 'level-1',
          level_name: 'Level 1',
          price_percentage: 100,
          description: 'Harga penuh',
        },
        {
          id: null,
          level_name: 'Level 2',
          price_percentage: 95,
        },
      ])
    ).toEqual([
      {
        id: 'level-1',
        level_name: 'Level 1',
        price_percentage: 100,
        description: 'Harga penuh',
      },
    ]);
  });
});
