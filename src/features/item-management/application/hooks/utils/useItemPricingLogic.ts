import { useCallback } from 'react';
import {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from '../../../shared/utils/PriceCalculator';

interface UseItemPricingLogicProps {
  formData: {
    base_price: number;
    sell_price: number;
  };
}

/**
 * Hook for managing pricing calculations and logic
 *
 * Handles:
 * - Profit percentage calculations
 * - Sell price calculation from margin
 * - Price validation and formatting
 */
export const useItemPricingLogic = ({ formData }: UseItemPricingLogicProps) => {
  // Memoized wrapper functions for performance
  const calculateProfitPercentageWrapper = useCallback(
    (base_price?: number, sell_price?: number) => {
      const currentBasePrice = base_price ?? formData.base_price;
      const currentSellPrice = sell_price ?? formData.sell_price;
      return calculateProfitPercentage(currentBasePrice, currentSellPrice);
    },
    [formData.base_price, formData.sell_price]
  );

  const calculateSellPriceFromMarginWrapper = useCallback(
    (margin: number) => {
      return calculateSellPriceFromMargin(formData.base_price, margin);
    },
    [formData.base_price]
  );

  return {
    calculateProfitPercentage: calculateProfitPercentageWrapper,
    calculateSellPriceFromMargin: calculateSellPriceFromMarginWrapper,
  };
};
