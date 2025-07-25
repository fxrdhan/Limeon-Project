import { useMemo } from "react";

interface UseItemPriceCalculationsProps {
  basePrice: number;
  sellPrice: number;
}

export const useItemPriceCalculations = ({
  basePrice,
  sellPrice,
}: UseItemPriceCalculationsProps) => {
  const calculateProfitPercentage = useMemo(() => {
    if (!basePrice || basePrice <= 0) return null;
    if (!sellPrice || sellPrice <= 0) return null;
    
    const profit = sellPrice - basePrice;
    const profitPercentage = (profit / basePrice) * 100;
    return profitPercentage;
  }, [basePrice, sellPrice]);

  const calculateSellPriceFromMargin = (marginPercentage: number): number => {
    if (!basePrice || basePrice <= 0) return 0;
    return Math.round(basePrice * (1 + marginPercentage / 100));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const parseCurrency = (currencyString: string): number => {
    const numericString = currencyString.replace(/[^\d]/g, "");
    return parseInt(numericString) || 0;
  };

  return {
    calculateProfitPercentage,
    calculateSellPriceFromMargin,
    formatCurrency,
    parseCurrency,
  };
};