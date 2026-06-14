import { salesService } from '@/services/api/sales.service';

export const createSaleWithItems = (
  saleData: Parameters<typeof salesService.createSaleWithItems>[0],
  items: Parameters<typeof salesService.createSaleWithItems>[1]
) => salesService.createSaleWithItems(saleData, items);
