import { itemsService } from '@/services/api/items.service';
import type { ServiceResponse } from '@/services/api/base.service';
import type { Item } from '@/types/database';

export const itemCatalogService = {
  getItemWithDetails(itemId: string): Promise<ServiceResponse<Item>> {
    return itemsService.getItemWithDetails(itemId);
  },

  deleteItem(itemId: string): Promise<ServiceResponse<null>> {
    return itemsService.delete(itemId);
  },
};
