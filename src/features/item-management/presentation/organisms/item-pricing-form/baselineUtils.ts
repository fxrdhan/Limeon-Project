import type { CustomerLevel } from '@/types/database';

export const getBaselineDiscount = (level: CustomerLevel) =>
  Math.max(0, 100 - Number(level.price_percentage || 0));

export const parseDiscountInput = (value: string) =>
  value.trim() ? Number(value.replace(',', '.')) : 0;

export const normalizeDiscount = (value: number) =>
  Number.isNaN(value) ? 0 : Math.min(Math.max(value, 0), 100);

export const getBaselineCreateState = (discountInput: string) => {
  const parsedDiscount = parseDiscountInput(discountInput);
  const normalizedDiscount = normalizeDiscount(parsedDiscount);

  return {
    parsedDiscount,
    normalizedDiscount,
    canCreate: discountInput.trim().length > 0 && !Number.isNaN(parsedDiscount),
    pricePercentage: Math.max(0, 100 - normalizedDiscount),
  };
};

export const buildBaselineDrafts = (levels: CustomerLevel[]) => {
  const drafts: Record<string, string> = {};

  levels.forEach(level => {
    drafts[level.id] = getBaselineDiscount(level).toString();
  });

  return drafts;
};

export const getBaselinePlaceholderName = (levels: CustomerLevel[]) =>
  `Level ${levels.length + 1}`;

export const removeBaselineDraft = (
  baselineDrafts: Record<string, string>,
  levelId: string
) => {
  if (!Object.prototype.hasOwnProperty.call(baselineDrafts, levelId)) {
    return baselineDrafts;
  }

  const next = { ...baselineDrafts };
  delete next[levelId];
  return next;
};

export const appendBaselineDraft = (
  baselineDrafts: Record<string, string>,
  levelId: string,
  normalizedDiscount: number
) => ({
  ...baselineDrafts,
  [levelId]: normalizedDiscount.toString(),
});

export const getIsBaselineAddActive = ({
  baselineAddOpen,
  canCreateBaselineLevel,
  disabled,
  isCreating,
}: {
  baselineAddOpen: boolean;
  canCreateBaselineLevel: boolean;
  disabled: boolean;
  isCreating: boolean | undefined;
}) => baselineAddOpen && canCreateBaselineLevel && !disabled && !isCreating;

export const getPricingSectionTitle = (showLevelPricing: boolean) =>
  showLevelPricing ? 'Pengaturan Level Pelanggan' : 'Unit & Harga Dasar';

export const getIsLevelPricingSwitchChecked = ({
  formIsLevelPricingActive,
  isLevelPricingActive,
}: {
  formIsLevelPricingActive: boolean | undefined;
  isLevelPricingActive: boolean | undefined;
}) => isLevelPricingActive ?? formIsLevelPricingActive ?? true;

export const buildBaselineUpdates = (
  levels: CustomerLevel[],
  baselineDrafts: Record<string, string>
) => {
  return levels
    .map(level => {
      const currentDiscount = getBaselineDiscount(level);
      const rawValue = baselineDrafts[level.id] ?? currentDiscount.toString();
      const normalized = normalizeDiscount(parseDiscountInput(rawValue));
      const nextPricePercentage = Math.max(0, 100 - normalized);

      return {
        id: level.id,
        price_percentage: nextPricePercentage,
        hasChange: Math.abs(normalized - currentDiscount) > 0.001,
      };
    })
    .filter(update => update.hasChange)
    .map(({ id, price_percentage }) => ({ id, price_percentage }));
};
