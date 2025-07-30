/**
 * Calculates profit percentage from base price and sell price
 */
export const calculateProfitPercentage = (
  basePrice: number,
  sellPrice: number,
): number | null => {
  if (basePrice > 0 && sellPrice >= 0) {
    return ((sellPrice - basePrice) / basePrice) * 100;
  }
  return null;
};

/**
 * Calculates sell price from base price and margin percentage
 */
export const calculateSellPriceFromMargin = (
  basePrice: number,
  marginPercentage: number,
): number => {
  if (basePrice > 0) {
    const sellPrice = basePrice * (1 + marginPercentage / 100);
    return Math.round(sellPrice);
  }
  return 0;
};

/**
 * Validates and formats margin percentage
 */
export const formatMarginPercentage = (
  basePrice: number,
  sellPrice: number,
): string => {
  const profit = calculateProfitPercentage(basePrice, sellPrice);
  return profit !== null ? profit.toFixed(1) : "0";
};

/**
 * Validates price input and returns clean numeric value
 */
export const validatePriceInput = (value: string): number => {
  const numericValue = parseFloat(value) || 0;
  return Math.max(0, numericValue);
};

/**
 * Calculates price suggestions based on margin ranges
 */
export const generatePriceSuggestions = (
  basePrice: number,
): Array<{ margin: number; price: number; label: string }> => {
  if (basePrice <= 0) return [];

  const suggestions = [
    { margin: 10, label: "Margin Rendah (10%)" },
    { margin: 20, label: "Margin Standar (20%)" },
    { margin: 30, label: "Margin Tinggi (30%)" },
    { margin: 50, label: "Margin Premium (50%)" },
  ];

  return suggestions.map(suggestion => ({
    ...suggestion,
    price: calculateSellPriceFromMargin(basePrice, suggestion.margin),
  }));
};

/**
 * Validates if margin percentage is within acceptable range
 */
export const validateMarginRange = (
  marginPercentage: number,
): { isValid: boolean; warning?: string } => {
  if (marginPercentage < 0) {
    return {
      isValid: false,
      warning: "Margin tidak boleh negatif",
    };
  }

  if (marginPercentage > 200) {
    return {
      isValid: true,
      warning: "Margin sangat tinggi (>200%), pastikan harga kompetitif",
    };
  }

  if (marginPercentage < 5) {
    return {
      isValid: true,
      warning: "Margin sangat rendah (<5%), periksa profitabilitas",
    };
  }

  return { isValid: true };
};

/**
 * Calculates break-even analysis
 */
export const calculateBreakEven = (
  basePrice: number,
  fixedCosts: number = 0,
): { breakEvenPrice: number; minimumMargin: number } => {
  const breakEvenPrice = basePrice + fixedCosts;
  const minimumMargin = fixedCosts > 0 ? (fixedCosts / basePrice) * 100 : 0;

  return {
    breakEvenPrice: Math.round(breakEvenPrice),
    minimumMargin: Math.round(minimumMargin * 100) / 100,
  };
};