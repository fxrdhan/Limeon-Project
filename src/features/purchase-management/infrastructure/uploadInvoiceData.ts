import { uploadAndExtractInvoice } from '@/services/invoiceExtractor';

export const uploadAndExtractPurchaseInvoice = (file: File) =>
  uploadAndExtractInvoice(file);
