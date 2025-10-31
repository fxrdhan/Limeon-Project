/**
 * PriceCalculator Tests (Optimized)
 *
 * Consolidated pricing logic tests with parameterization
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
  formatMarginPercentage,
  validatePriceInput,
  generatePriceSuggestions,
  validateMarginRange,
  calculateBreakEven,
} from './PriceCalculator';

describe('PriceCalculator', () => {
  describe('calculateProfitPercentage', () => {
    it.each([
      { base: 10000, sell: 12000, expected: 20 },
      { base: 50000, sell: 75000, expected: 50 },
      { base: 10000, sell: 10000, expected: 0 }, // Zero profit
      { base: 10000, sell: 8000, expected: -20 }, // Negative margin
    ])(
      'should calculate profit: $base → $sell = $expected%',
      ({ base, sell, expected }) => {
        expect(calculateProfitPercentage(base, sell)).toBe(expected);
      }
    );

    it('should return null for invalid base price', () => {
      expect(calculateProfitPercentage(0, 10000)).toBeNull();
      expect(calculateProfitPercentage(-100, 10000)).toBeNull();
    });

    it('should handle edge cases accurately', () => {
      expect(calculateProfitPercentage(0.5, 1)).toBe(100); // Small prices
      expect(calculateProfitPercentage(1000000, 1500000)).toBe(50); // Large prices
      expect(calculateProfitPercentage(12345.67, 15432.1)).toBeCloseTo(25, 0); // Decimals
    });
  });

  describe('calculateSellPriceFromMargin', () => {
    it.each([
      { base: 10000, margin: 20, expected: 12000 },
      { base: 50000, margin: 30, expected: 65000 },
      { base: 10000, margin: 0, expected: 10000 }, // Zero margin
      { base: 10000, margin: 200, expected: 30000 }, // High margin
    ])(
      'should calculate sell price: $base + $margin% = $expected',
      ({ base, margin, expected }) => {
        expect(calculateSellPriceFromMargin(base, margin)).toBe(expected);
      }
    );

    it('should round to nearest integer', () => {
      expect(calculateSellPriceFromMargin(10000, 33)).toBe(13300);
      expect(calculateSellPriceFromMargin(10000, 3.33)).toBe(10333);
    });

    it('should return 0 for invalid base price', () => {
      expect(calculateSellPriceFromMargin(0, 20)).toBe(0);
      expect(calculateSellPriceFromMargin(-100, 20)).toBe(0);
    });

    it('should handle fractional margins and realistic scenarios', () => {
      expect(calculateSellPriceFromMargin(10000, 15.5)).toBe(11550);
      expect(calculateSellPriceFromMargin(50000, 12)).toBe(56000); // Generic medicine
      expect(calculateSellPriceFromMargin(100000, 25)).toBe(125000); // Branded medicine
    });
  });

  describe('formatMarginPercentage', () => {
    it.each([
      { base: 10000, sell: 12000, expected: '20.0' },
      { base: 10000, sell: 13333, expected: '33.3' },
      { base: 10000, sell: 10000, expected: '0.0' },
      { base: 10000, sell: 8000, expected: '-20.0' },
    ])(
      'should format margin: $base → $sell = $expected%',
      ({ base, sell, expected }) => {
        expect(formatMarginPercentage(base, sell)).toBe(expected);
      }
    );

    it('should return "0" for invalid inputs', () => {
      expect(formatMarginPercentage(0, 10000)).toBe('0');
      expect(formatMarginPercentage(-100, 10000)).toBe('0');
    });

    it('should properly round decimal values', () => {
      expect(formatMarginPercentage(9999, 12345)).toBe('23.5');
    });
  });

  describe('validatePriceInput', () => {
    it.each([
      { input: '10000', expected: 10000 },
      { input: '123.45', expected: 123.45 },
      { input: ' 10000 ', expected: 10000 }, // With spaces
      { input: '', expected: 0 }, // Empty
      { input: 'abc', expected: 0 }, // Non-numeric
      { input: '-100', expected: 0 }, // Negative converted to 0
    ])('should parse "$input" as $expected', ({ input, expected }) => {
      expect(validatePriceInput(input)).toBe(expected);
    });

    it('should handle decimal and currency-like inputs', () => {
      expect(validatePriceInput('12.50')).toBe(12.5);
      expect(validatePriceInput('999.99')).toBe(999.99);
      // Note: parseFloat stops at comma
      expect(validatePriceInput('1,000')).toBe(1);
    });
  });

  describe('generatePriceSuggestions', () => {
    it('should generate 4 price suggestions with margins: 10%, 20%, 30%, 50%', () => {
      const suggestions = generatePriceSuggestions(10000);

      expect(suggestions).toHaveLength(4);
      expect(suggestions[0]).toMatchObject({
        margin: 10,
        price: 11000,
        label: 'Margin Rendah (10%)',
      });
      expect(suggestions[1]).toMatchObject({
        margin: 20,
        price: 12000,
        label: 'Margin Standar (20%)',
      });
      expect(suggestions[2]).toMatchObject({
        margin: 30,
        price: 13000,
        label: 'Margin Tinggi (30%)',
      });
      expect(suggestions[3]).toMatchObject({
        margin: 50,
        price: 15000,
        label: 'Margin Premium (50%)',
      });
    });

    it('should return empty array for invalid base price and handle various prices', () => {
      expect(generatePriceSuggestions(0)).toEqual([]);
      expect(generatePriceSuggestions(-100)).toEqual([]);

      // All prices should be integers
      const suggestions = generatePriceSuggestions(12345);
      suggestions.forEach(s => expect(Number.isInteger(s.price)).toBe(true));
    });
  });

  describe('validateMarginRange', () => {
    it.each([
      { margin: 10, isValid: true, warning: undefined },
      { margin: 50, isValid: true, warning: undefined },
      { margin: 100, isValid: true, warning: undefined },
    ])(
      'should accept normal margins: $margin%',
      ({ margin, isValid, warning }) => {
        const result = validateMarginRange(margin);
        expect(result.isValid).toBe(isValid);
        expect(result.warning).toBe(warning);
      }
    );

    it('should reject negative margins', () => {
      const result = validateMarginRange(-10);
      expect(result.isValid).toBe(false);
      expect(result.warning).toBe('Margin tidak boleh negatif');
    });

    it.each([
      { margin: 0, warning: 'sangat rendah' },
      { margin: 3, warning: 'sangat rendah' },
      { margin: 250, warning: 'sangat tinggi' },
    ])('should warn for extreme margins: $margin%', ({ margin, warning }) => {
      const result = validateMarginRange(margin);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain(warning);
    });

    it('should handle decimal margins correctly', () => {
      expect(validateMarginRange(4.9).warning).toBeDefined();
      expect(validateMarginRange(5.1).warning).toBeUndefined();
    });
  });

  describe('calculateBreakEven', () => {
    it.each([
      { base: 10000, fixed: 0, breakEven: 10000, minMargin: 0 },
      { base: 10000, fixed: 2000, breakEven: 12000, minMargin: 20 },
      { base: 10000, fixed: 5000, breakEven: 15000, minMargin: 50 },
      { base: 50000, fixed: 5000, breakEven: 55000, minMargin: 10 }, // Operational costs
      { base: 20000, fixed: 8000, breakEven: 28000, minMargin: 40 }, // Premium location
    ])(
      'should calculate break-even: base=$base, fixed=$fixed',
      ({ base, fixed, breakEven, minMargin }) => {
        const result = calculateBreakEven(base, fixed);
        expect(result.breakEvenPrice).toBe(breakEven);
        expect(result.minimumMargin).toBe(minMargin);
      }
    );

    it('should round break-even price to integer and margin to 2 decimals', () => {
      const result1 = calculateBreakEven(12345, 6789);
      expect(Number.isInteger(result1.breakEvenPrice)).toBe(true);
      expect(result1.breakEvenPrice).toBe(19134);

      const result2 = calculateBreakEven(9999, 3333);
      expect(result2.minimumMargin).toBeCloseTo(33.33, 2);
    });
  });

  describe('Integration: Real-world pharmacy scenarios', () => {
    it('Scenario 1: Generic medicine with standard markup', () => {
      const basePrice = 15000;
      const margin = 15;

      const sellPrice = calculateSellPriceFromMargin(basePrice, margin);
      const profit = calculateProfitPercentage(basePrice, sellPrice);
      const validation = validateMarginRange(margin);

      expect(sellPrice).toBe(17250);
      expect(profit).toBe(15);
      expect(validation.isValid).toBe(true);
      expect(validation.warning).toBeUndefined();
    });

    it('Scenario 2: Branded medicine with premium pricing', () => {
      const basePrice = 100000;
      const margin = 35;

      const sellPrice = calculateSellPriceFromMargin(basePrice, margin);
      const suggestions = generatePriceSuggestions(basePrice);

      expect(sellPrice).toBe(135000);
      expect(suggestions.some(s => s.margin === 30)).toBe(true);
      expect(suggestions.some(s => s.margin === 50)).toBe(true);
    });

    it('Scenario 3: Non-medicine item with high margin & loss-leader pricing', () => {
      // High margin non-medicine
      const basePrice1 = 25000;
      const margin1 = 50;
      const sellPrice1 = calculateSellPriceFromMargin(basePrice1, margin1);
      const validation1 = validateMarginRange(margin1);
      const breakEven = calculateBreakEven(basePrice1, 5000);

      expect(sellPrice1).toBe(37500);
      expect(validation1.isValid).toBe(true);
      expect(breakEven.minimumMargin).toBe(20);

      // Loss-leader
      const basePrice2 = 50000;
      const margin2 = 3;
      const sellPrice2 = calculateSellPriceFromMargin(basePrice2, margin2);
      const validation2 = validateMarginRange(margin2);

      expect(sellPrice2).toBe(51500);
      expect(validation2.warning).toContain('sangat rendah');
    });

    it('Scenario 4: Complete pricing validation flow (user input to final price)', () => {
      // User enters base price as string
      const userInput = '25000';
      const basePrice = validatePriceInput(userInput);

      // System generates suggestions
      const suggestions = generatePriceSuggestions(basePrice);

      // User selects 20% margin
      const selectedMargin = 20;
      const sellPrice = calculateSellPriceFromMargin(basePrice, selectedMargin);

      // Validate the selection
      const validation = validateMarginRange(selectedMargin);

      // Format for display
      const displayMargin = formatMarginPercentage(basePrice, sellPrice);

      expect(basePrice).toBe(25000);
      expect(suggestions).toHaveLength(4);
      expect(sellPrice).toBe(30000);
      expect(validation.isValid).toBe(true);
      expect(displayMargin).toBe('20.0');
    });
  });
});
