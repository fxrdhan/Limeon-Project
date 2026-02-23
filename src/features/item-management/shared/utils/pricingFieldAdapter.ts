interface PricingFieldsSnakeInput {
  base_price?: number | null;
  sell_price?: number | null;
  is_level_pricing_active?: boolean | null;
}

interface PricingFieldsSnakePatch {
  base_price?: number;
  sell_price?: number;
  is_level_pricing_active?: boolean;
}

interface PricingFieldsCamel {
  basePrice: number;
  sellPrice: number;
  isLevelPricingActive: boolean;
}

const toNumber = (value: number | null | undefined) => Number(value) || 0;

export const toPricingFields = (
  fields: PricingFieldsSnakeInput
): PricingFieldsCamel => ({
  basePrice: toNumber(fields.base_price),
  sellPrice: toNumber(fields.sell_price),
  isLevelPricingActive: fields.is_level_pricing_active ?? true,
});

export const toPricingPatch = (
  patch: Partial<PricingFieldsCamel>
): Partial<PricingFieldsSnakePatch> => {
  const result: Partial<PricingFieldsSnakePatch> = {};

  if (patch.basePrice !== undefined) {
    result.base_price = patch.basePrice;
  }

  if (patch.sellPrice !== undefined) {
    result.sell_price = patch.sellPrice;
  }

  if (patch.isLevelPricingActive !== undefined) {
    result.is_level_pricing_active = patch.isLevelPricingActive;
  }

  return result;
};
