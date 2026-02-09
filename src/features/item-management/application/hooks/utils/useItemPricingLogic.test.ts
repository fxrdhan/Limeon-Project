import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useItemPricingLogic } from './useItemPricingLogic';

describe('useItemPricingLogic', () => {
  it('calculates profit percentage from current form data by default', () => {
    const { result } = renderHook(() =>
      useItemPricingLogic({
        formData: { base_price: 100, sell_price: 130 },
      })
    );

    expect(result.current.calculateProfitPercentage()).toBe(30);
  });

  it('uses explicit arguments when calculating profit percentage', () => {
    const { result } = renderHook(() =>
      useItemPricingLogic({
        formData: { base_price: 90, sell_price: 100 },
      })
    );

    expect(result.current.calculateProfitPercentage(200, 260)).toBe(30);
  });

  it('calculates sell price from margin using current base price', () => {
    const { result, rerender } = renderHook(
      ({ basePrice }: { basePrice: number }) =>
        useItemPricingLogic({
          formData: { base_price: basePrice, sell_price: 0 },
        }),
      { initialProps: { basePrice: 80 } }
    );

    expect(result.current.calculateSellPriceFromMargin(25)).toBe(100);

    rerender({ basePrice: 120 });
    expect(result.current.calculateSellPriceFromMargin(10)).toBe(132);
  });
});
