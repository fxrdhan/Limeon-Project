import type { ExtractedInvoiceData } from '@/types';
import {
  regenerateInvoiceData,
  saveInvoiceToDatabase,
} from '@/services/invoiceExtractor';

export const regenerateConfirmedInvoiceData = (imageIdentifier: string) =>
  regenerateInvoiceData(imageIdentifier);

export const saveConfirmedInvoiceToDatabase = (
  invoiceData: ExtractedInvoiceData,
  imageIdentifier: string
) => saveInvoiceToDatabase(invoiceData, imageIdentifier);
