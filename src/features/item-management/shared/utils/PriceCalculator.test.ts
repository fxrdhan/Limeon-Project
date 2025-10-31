/**
 * PriceCalculator Tests
 *
 * Comprehensive tests for all pricing calculation functions
 * with real-world scenarios and edge cases
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
    it('should calculate correct profit percentage for normal prices', () => {
      expect(calculateProfitPercentage(10000, 12000)).toBe(20);
      expect(calculateProfitPercentage(50000, 75000)).toBe(50);
      expect(calculateProfitPercentage(1000, 1100)).toBe(10);
    });

    it('should handle zero profit (sell price equals base price)', () => {
      expect(calculateProfitPercentage(10000, 10000)).toBe(0);
    });

    it('should handle negative margin (loss scenario)', () => {
      expect(calculateProfitPercentage(10000, 8000)).toBe(-20);
      expect(calculateProfitPercentage(50000, 40000)).toBe(-20);
    });

    it('should return null for invalid base price', () => {
      expect(calculateProfitPercentage(0, 10000)).toBeNull();
      expect(calculateProfitPercentage(-100, 10000)).toBeNull();
    });

    it('should handle decimal and extreme prices accurately', () => {
      // Small prices
      expect(calculateProfitPercentage(0.5, 1)).toBe(100);
      // Large prices
      expect(calculateProfitPercentage(1000000, 1500000)).toBe(50);
      // Decimal precision
      expect(calculateProfitPercentage(12345.67, 15432.1)).toBeCloseTo(25, 0);
    });
  });

  describe('calculateSellPriceFromMargin', () => {
    it('should calculate sell price correctly from margin percentage', () => {
      expect(calculateSellPriceFromMargin(10000, 20)).toBe(12000);
      expect(calculateSellPriceFromMargin(50000, 30)).toBe(65000);
      expect(calculateSellPriceFromMargin(1000, 50)).toBe(1500);
    });

    it('should round to nearest integer', () => {
      // 10000 * 1.33 = 13300
      expect(calculateSellPriceFromMargin(10000, 33)).toBe(13300);
      // Should round 10333.333 to 10333
      expect(calculateSellPriceFromMargin(10000, 3.33)).toBe(10333);
    });

    it('should handle zero margin', () => {
      expect(calculateSellPriceFromMargin(10000, 0)).toBe(10000);
    });

    it('should handle very high margins (luxury/specialty items)', () => {
      expect(calculateSellPriceFromMargin(10000, 200)).toBe(30000);
      expect(calculateSellPriceFromMargin(10000, 500)).toBe(60000);
    });

    it('should return 0 for invalid base price', () => {
      expect(calculateSellPriceFromMargin(0, 20)).toBe(0);
      expect(calculateSellPriceFromMargin(-100, 20)).toBe(0);
    });

    it('should handle fractional margins', () => {
      expect(calculateSellPriceFromMargin(10000, 15.5)).toBe(11550);
      expect(calculateSellPriceFromMargin(10000, 22.75)).toBe(12275);
      // Realistic pharmacy margins also covered here
      expect(calculateSellPriceFromMargin(50000, 12)).toBe(56000); // Generic
      expect(calculateSellPriceFromMargin(100000, 25)).toBe(125000); // Branded
      expect(calculateSellPriceFromMargin(20000, 40)).toBe(28000); // Non-medicine
    });
  });

  describe('formatMarginPercentage', () => {
    it('should format margin as string with one decimal place', () => {
      expect(formatMarginPercentage(10000, 12000)).toBe('20.0');
      expect(formatMarginPercentage(10000, 13333)).toBe('33.3');
    });

    it('should handle zero margin', () => {
      expect(formatMarginPercentage(10000, 10000)).toBe('0.0');
    });

    it('should format negative margin', () => {
      expect(formatMarginPercentage(10000, 8000)).toBe('-20.0');
    });

    it('should return "0" for invalid inputs', () => {
      expect(formatMarginPercentage(0, 10000)).toBe('0');
      expect(formatMarginPercentage(-100, 10000)).toBe('0');
    });

    it('should properly round decimal values', () => {
      expect(formatMarginPercentage(9999, 12345)).toBe('23.5');
    });
  });

  describe('validatePriceInput', () => {
    it('should parse valid numeric strings', () => {
      expect(validatePriceInput('10000')).toBe(10000);
      expect(validatePriceInput('123.45')).toBe(123.45);
    });

    it('should handle strings with spaces', () => {
      expect(validatePriceInput(' 10000 ')).toBe(10000);
    });

    it('should return 0 for empty string', () => {
      expect(validatePriceInput('')).toBe(0);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(validatePriceInput('abc')).toBe(0);
      expect(validatePriceInput('invalid')).toBe(0);
    });

    it('should convert negative values to 0', () => {
      expect(validatePriceInput('-100')).toBe(0);
      expect(validatePriceInput('-999.99')).toBe(0);
    });

    it('should handle decimal inputs', () => {
      expect(validatePriceInput('12.50')).toBe(12.5);
      expect(validatePriceInput('999.99')).toBe(999.99);
    });

    it('should handle currency-like inputs (with commas)', () => {
      // Note: parseFloat handles this by stopping at comma
      expect(validatePriceInput('1,000')).toBe(1);
      expect(validatePriceInput('10,500.50')).toBe(10);
    });
  });

  describe('generatePriceSuggestions', () => {
    it('should generate 4 price suggestions with different margins', () => {
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

    it('should return empty array for zero or negative base price', () => {
      expect(generatePriceSuggestions(0)).toEqual([]);
      expect(generatePriceSuggestions(-100)).toEqual([]);
    });

    it('should handle various base prices and round to integers', () => {
      // Small prices
      const smallSuggestions = generatePriceSuggestions(100);
      expect(smallSuggestions[0].price).toBe(110);
      expect(smallSuggestions[1].price).toBe(120);

      // Large prices
      const largeSuggestions = generatePriceSuggestions(1000000);
      expect(largeSuggestions[0].price).toBe(1100000);
      expect(largeSuggestions[1].price).toBe(1200000);

      // All prices should be integers
      const suggestions = generatePriceSuggestions(12345);
      suggestions.forEach(suggestion => {
        expect(Number.isInteger(suggestion.price)).toBe(true);
      });
    });
  });

  describe('validateMarginRange', () => {
    it('should accept normal margins (5-200%)', () => {
      expect(validateMarginRange(10)).toEqual({ isValid: true });
      expect(validateMarginRange(50)).toEqual({ isValid: true });
      expect(validateMarginRange(100)).toEqual({ isValid: true });
    });

    it('should reject negative margins', () => {
      const result = validateMarginRange(-10);
      expect(result.isValid).toBe(false);
      expect(result.warning).toBe('Margin tidak boleh negatif');
    });

    it('should warn for very low margins (<5%)', () => {
      const result = validateMarginRange(3);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBe(
        'Margin sangat rendah (<5%), periksa profitabilitas'
      );
    });

    it('should warn for very high margins (>200%)', () => {
      const result = validateMarginRange(250);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBe(
        'Margin sangat tinggi (>200%), pastikan harga kompetitif'
      );
    });

    it('should warn for 0% margin', () => {
      const result = validateMarginRange(0);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBe(
        'Margin sangat rendah (<5%), periksa profitabilitas'
      );
    });

    it('should handle decimal margins', () => {
      expect(validateMarginRange(4.9).warning).toBeDefined();
      expect(validateMarginRange(5.1).warning).toBeUndefined();
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even without fixed costs', () => {
      const result = calculateBreakEven(10000);
      expect(result).toEqual({
        breakEvenPrice: 10000,
        minimumMargin: 0,
      });
    });

    it('should calculate break-even with fixed costs', () => {
      const result = calculateBreakEven(10000, 2000);
      expect(result).toEqual({
        breakEvenPrice: 12000,
        minimumMargin: 20,
      });
    });

    it('should handle high fixed costs', () => {
      const result = calculateBreakEven(10000, 5000);
      expect(result).toEqual({
        breakEvenPrice: 15000,
        minimumMargin: 50,
      });
    });

    it('should round break-even price to integer and margin to 2 decimals', () => {
      const result1 = calculateBreakEven(12345, 6789);
      expect(Number.isInteger(result1.breakEvenPrice)).toBe(true);
      expect(result1.breakEvenPrice).toBe(19134);

      const result2 = calculateBreakEven(9999, 3333);
      expect(result2.minimumMargin).toBeCloseTo(33.33, 2);
    });

    it('should handle scenario: operational costs (rent, utilities)', () => {
      // Base price: 50000, operational cost per item: 5000 (10%)
      const result = calculateBreakEven(50000, 5000);
      expect(result.breakEvenPrice).toBe(55000);
      expect(result.minimumMargin).toBe(10);
    });

    it('should handle scenario: premium location markup', () => {
      // Base price: 20000, location markup: 8000 (40%)
      const result = calculateBreakEven(20000, 8000);
      expect(result.breakEvenPrice).toBe(28000);
      expect(result.minimumMargin).toBe(40);
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

    it('Scenario 3: Non-medicine item with high margin', () => {
      const basePrice = 25000;
      const margin = 50;

      const sellPrice = calculateSellPriceFromMargin(basePrice, margin);
      const validation = validateMarginRange(margin);
      const breakEven = calculateBreakEven(basePrice, 5000);

      expect(sellPrice).toBe(37500);
      expect(validation.isValid).toBe(true);
      expect(breakEven.minimumMargin).toBe(20);
    });

    it('Scenario 4: Loss-leader pricing (strategic low margin)', () => {
      const basePrice = 50000;
      const margin = 3;

      const sellPrice = calculateSellPriceFromMargin(basePrice, margin);
      const validation = validateMarginRange(margin);

      expect(sellPrice).toBe(51500);
      expect(validation.isValid).toBe(true);
      expect(validation.warning).toContain('sangat rendah');
    });

    it('Scenario 5: Luxury health product with very high margin', () => {
      const basePrice = 200000;
      const margin = 250;

      const sellPrice = calculateSellPriceFromMargin(basePrice, margin);
      const validation = validateMarginRange(margin);

      expect(sellPrice).toBe(700000);
      expect(validation.isValid).toBe(true);
      expect(validation.warning).toContain('sangat tinggi');
    });

    it('Scenario 6: Pricing validation flow (user input to final price)', () => {
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
