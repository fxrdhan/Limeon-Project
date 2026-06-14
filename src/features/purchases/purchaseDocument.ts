import type { PurchaseData, PurchaseItem, Subtotals } from '@/types';

export const PURCHASE_PRINT_SESSION_KEY = 'purchaseData';

export const formatPurchaseDocumentCurrency = (
  value: number | bigint,
  prefix = ''
) => {
  const formatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${prefix}${formatter.format(value)}`;
};

export const getPurchaseDocumentPaymentStatusLabel = (status: string) => {
  if (status === 'paid') return 'Lunas';
  if (status === 'partial') return 'Sebagian';

  return 'Belum Dibayar';
};

export const getPurchaseDocumentPaymentStatusClass = (status: string) => {
  if (status === 'paid') return 'text-green-600';
  if (status === 'partial') return 'text-orange-600';

  return 'text-red-600';
};

export const getPurchaseDocumentPaymentMethodLabel = (method: string) => {
  if (method === 'cash') return 'Tunai';
  if (method === 'transfer') return 'Transfer';
  if (method === 'credit') return 'Kredit';

  return method;
};

export const getPurchaseDocumentItemCode = (item: {
  item?: PurchaseItem['item'] | null;
}) => item.item?.code || '-';

export const getPurchaseDocumentItemName = (item: {
  item?: PurchaseItem['item'] | null;
}) => item.item?.name || 'Item tidak ditemukan';

export const getPurchaseDocumentPositivePercentageLabel = (value: number) =>
  value > 0 ? `${value}%` : '-';

export const calculatePurchaseDocumentSubtotals = (
  purchase: Pick<PurchaseData, 'is_vat_included'> | null | undefined,
  items: PurchaseItem[]
): Subtotals => {
  const baseTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discountTotal = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const discountAmount = (itemTotal * item.discount) / 100;
    return sum + discountAmount;
  }, 0);

  const afterDiscountTotal = baseTotal - discountTotal;

  const vatTotal = purchase?.is_vat_included
    ? 0
    : items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const afterDiscount = itemTotal - (itemTotal * item.discount) / 100;
        const vatAmount = afterDiscount * (item.vat_percentage / 100);
        return sum + vatAmount;
      }, 0);

  const grandTotal = purchase?.is_vat_included
    ? afterDiscountTotal
    : afterDiscountTotal + vatTotal;

  return {
    baseTotal,
    discountTotal,
    afterDiscountTotal,
    vatTotal,
    grandTotal,
  };
};
