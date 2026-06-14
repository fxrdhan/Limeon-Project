import { companyProfileService } from '@/services/api/companyProfile.service';
import { purchasesService } from '@/services/api/purchases.service';

export const fetchPurchaseFormCompanyProfile = () =>
  companyProfileService.getProfile();

export const createPurchaseWithItems = (
  purchaseData: Parameters<typeof purchasesService.createPurchaseWithItems>[0],
  items: Parameters<typeof purchasesService.createPurchaseWithItems>[1]
) => purchasesService.createPurchaseWithItems(purchaseData, items);
