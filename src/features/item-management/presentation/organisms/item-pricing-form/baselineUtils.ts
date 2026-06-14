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
