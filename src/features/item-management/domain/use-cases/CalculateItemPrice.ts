// Business rules for item price calculations
export interface PriceCalculationInput {
  basePrice: number;
  marginPercentage?: number;
  sellPrice?: number;
}

export interface PriceCalculationResult {
  calculatedSellPrice: number;
  calculatedMargin: number;
  profitAmount: number;
  isValidMargin: boolean;
  warnings: string[];
}

export const calculateItemPrice = (input: PriceCalculationInput): PriceCalculationResult => {
  const { basePrice, marginPercentage, sellPrice } = input;
  const warnings: string[] = [];

  let calculatedSellPrice: number;
  let calculatedMargin: number;

  if (marginPercentage !== undefined) {
    // Calculate sell price from margin
    calculatedSellPrice = basePrice * (1 + marginPercentage / 100);
    calculatedMargin = marginPercentage;
  } else if (sellPrice !== undefined) {
    // Calculate margin from sell price
    calculatedSellPrice = sellPrice;
    calculatedMargin = basePrice > 0 ? ((sellPrice - basePrice) / basePrice) * 100 : 0;
  } else {
    // No calculation input provided
    calculatedSellPrice = basePrice;
    calculatedMargin = 0;
  }

  const profitAmount = calculatedSellPrice - basePrice;

  // Business validation rules for margin
  let isValidMargin = true;
  if (calculatedMargin < 0) {
    isValidMargin = false;
    warnings.push('Margin negatif - harga jual lebih rendah dari harga beli');
  } else if (calculatedMargin < 5) {
    warnings.push('Margin sangat rendah (<5%) - periksa profitabilitas');
  } else if (calculatedMargin > 200) {
    warnings.push('Margin sangat tinggi (>200%) - pastikan harga kompetitif');
  }

  return {
    calculatedSellPrice: Math.round(calculatedSellPrice),
    calculatedMargin: Math.round(calculatedMargin * 100) / 100,
    profitAmount: Math.round(profitAmount),
    isValidMargin,
    warnings
  };
};