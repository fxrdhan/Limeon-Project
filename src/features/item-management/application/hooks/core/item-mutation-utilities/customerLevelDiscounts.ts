import type { CustomerLevelDiscount } from '@/types/database';
import { itemDataService } from '../../../../infrastructure/itemData.service';

const normalizeCustomerLevelDiscounts = (
  discounts?: CustomerLevelDiscount[]
) => {
  if (!Array.isArray(discounts)) return [];

  const normalized = discounts
    .filter(discount => discount.customer_level_id)
    .map(discount => ({
      customer_level_id: discount.customer_level_id,
      discount_percentage: Math.max(
        0,
        Number(discount.discount_percentage) || 0
      ),
    }));

  const uniqueByLevel = new Map<string, CustomerLevelDiscount>();
  normalized.forEach(discount => {
    uniqueByLevel.set(discount.customer_level_id, discount);
  });

  return Array.from(uniqueByLevel.values());
};

export const syncCustomerLevelDiscounts = async (
  itemId: string,
  discounts?: CustomerLevelDiscount[]
) => {
  if (!Array.isArray(discounts)) return;

  const normalizedDiscounts = normalizeCustomerLevelDiscounts(discounts);

  const { error } = await itemDataService.replaceCustomerLevelDiscounts(
    itemId,
    normalizedDiscounts
  );
  if (error) throw error;
};
