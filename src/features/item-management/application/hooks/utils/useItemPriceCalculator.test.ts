import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useItemPriceCalculations } from './useItemPriceCalculator';

describe('useItemPriceCalculations', () => {
  it('calculates profit percentage only when base and sell price are valid', () => {
    const { result, rerender } = renderHook(
      ({ basePrice, sellPrice }) =>
        useItemPriceCalculations({
          basePrice,
          sellPrice,
        }),
      {
        initialProps: {
          basePrice: 1000,
          sellPrice: 1300,
        },
      }
    );

    expect(result.current.calculateProfitPercentage).toBe(30);

    rerender({ basePrice: 0, sellPrice: 1300 });
    expect(result.current.calculateProfitPercentage).toBeNull();

    rerender({ basePrice: 1000, sellPrice: 0 });
    expect(result.current.calculateProfitPercentage).toBeNull();
  });

  it('calculates sell price from margin and handles invalid base price', () => {
    const { result, rerender } = renderHook(
      ({ basePrice, sellPrice }) =>
        useItemPriceCalculations({
          basePrice,
          sellPrice,
        }),
      {
        initialProps: {
          basePrice: 800,
          sellPrice: 1000,
        },
      }
    );

    expect(result.current.calculateSellPriceFromMargin(25)).toBe(1000);

    rerender({ basePrice: 0, sellPrice: 1000 });
    expect(result.current.calculateSellPriceFromMargin(25)).toBe(0);
  });

  it('formats and parses currency values correctly', () => {
    const { result } = renderHook(() =>
      useItemPriceCalculations({
        basePrice: 1000,
        sellPrice: 1200,
      })
    );

    expect(result.current.formatCurrency(1200000)).toBe('1.200.000');
    expect(result.current.parseCurrency('Rp 12.500')).toBe(12500);
    expect(result.current.parseCurrency('abc')).toBe(0);
  });
});
