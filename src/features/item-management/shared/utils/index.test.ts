import { describe, it, expect } from 'vitest';
import * as utils from './index';

describe('item-management shared utils index', () => {
  it('re-exports price calculator helpers', () => {
    expect(utils.calculateProfitPercentage).toBeTypeOf('function');
    expect(utils.calculateSellPriceFromMargin).toBeTypeOf('function');
    expect(utils.formatMarginPercentage).toBeTypeOf('function');
    expect(utils.generatePriceSuggestions).toBeTypeOf('function');
  });
});
