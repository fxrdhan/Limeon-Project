import { describe, it, expect } from 'vitest';
import { calculateItemPrice } from './CalculateItemPrice';

describe('CalculateItemPrice', () => {
  describe('calculateItemPrice', () => {
    it('should calculate sell price from margin percentage', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
        marginPercentage: 20,
      });

      expect(result.calculatedSellPrice).toBe(1200);
      expect(result.calculatedMargin).toBe(20);
      expect(result.profitAmount).toBe(200);
      expect(result.isValidMargin).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should calculate margin from sell price', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
        sellPrice: 1500,
      });

      expect(result.calculatedSellPrice).toBe(1500);
      expect(result.calculatedMargin).toBe(50);
      expect(result.profitAmount).toBe(500);
      expect(result.isValidMargin).toBe(true);
    });

    it('should warn when margin is negative', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
        sellPrice: 900,
      });

      expect(result.isValidMargin).toBe(false);
      expect(result.warnings).toContain(
        'Margin negatif - harga jual lebih rendah dari harga beli'
      );
    });

    it('should warn when margin is very low (<5%)', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
        sellPrice: 1030,
      });

      expect(result.warnings).toContain(
        'Margin sangat rendah (<5%) - periksa profitabilitas'
      );
    });

    it('should warn when margin is very high (>200%)', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
        sellPrice: 3500,
      });

      expect(result.warnings).toContain(
        'Margin sangat tinggi (>200%) - pastikan harga kompetitif'
      );
    });

    it('should default to base price when no calculation input', () => {
      const result = calculateItemPrice({
        basePrice: 1000,
      });

      expect(result.calculatedSellPrice).toBe(1000);
      expect(result.calculatedMargin).toBe(0);
      expect(result.profitAmount).toBe(0);
    });

    it('should handle zero base price gracefully', () => {
      const result = calculateItemPrice({
        basePrice: 0,
        sellPrice: 100,
      });

      expect(result.calculatedMargin).toBe(0);
    });
  });
});
