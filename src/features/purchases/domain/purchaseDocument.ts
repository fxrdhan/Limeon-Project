import type { PurchaseData, PurchaseItem, Subtotals } from '@/types';

export const PURCHASE_PRINT_SESSION_KEY = 'purchaseData';

export interface PurchasePrintSessionData {
  purchase: PurchaseData | null;
  items: PurchaseItem[];
  subtotals: Subtotals | null;
}

const EMPTY_PURCHASE_PRINT_SESSION: PurchasePrintSessionData = {
  purchase: null,
  items: [],
  subtotals: null,
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : fallback;

  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' || value === null ? value : null;

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const normalizePurchasePrintSupplier = (
  value: unknown
): PurchaseData['supplier'] => {
  if (!isObjectRecord(value)) {
    return {
      name: '',
      address: null,
      contact_person: null,
    };
  }

  return {
    name: typeof value.name === 'string' ? value.name : '',
    address: toNullableString(value.address),
    contact_person: toNullableString(value.contact_person),
  };
};

export const normalizePurchasePrintPurchase = (
  value: unknown
): PurchaseData | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const {
    checked_by,
    customer_address,
    customer_name,
    date,
    due_date,
    id,
    invoice_number,
    is_vat_included,
    notes,
    payment_method,
    payment_status,
    supplier,
    total,
    vat_amount,
    vat_percentage,
  } = value;

  if (
    typeof id !== 'string' ||
    typeof invoice_number !== 'string' ||
    typeof date !== 'string' ||
    typeof payment_status !== 'string' ||
    typeof payment_method !== 'string' ||
    typeof is_vat_included !== 'boolean'
  ) {
    return null;
  }

  return {
    id,
    invoice_number,
    date,
    due_date: toNullableString(due_date),
    total: toFiniteNumber(total),
    payment_status,
    payment_method,
    vat_percentage: toFiniteNumber(vat_percentage),
    is_vat_included,
    vat_amount: toFiniteNumber(vat_amount),
    notes: toNullableString(notes),
    supplier: normalizePurchasePrintSupplier(supplier),
    customer_name: toOptionalString(customer_name),
    customer_address: toOptionalString(customer_address),
    checked_by: toOptionalString(checked_by),
  };
};

const normalizePurchasePrintItemRelation = (
  value: unknown
): PurchaseItem['item'] => {
  if (!isObjectRecord(value)) {
    return {
      name: '',
      code: '',
    };
  }

  return {
    name: typeof value.name === 'string' ? value.name : '',
    code: typeof value.code === 'string' ? value.code : '',
  };
};

export const normalizePurchasePrintItem = (
  value: unknown
): PurchaseItem | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const {
    batch_no,
    discount,
    expiry_date,
    id,
    inventory_unit_id,
    item,
    item_id,
    item_name,
    price,
    quantity,
    subtotal,
    unit,
    unit_conversion_rate,
    unit_id,
    vat_percentage,
  } = value;

  if (
    typeof id !== 'string' ||
    typeof item_id !== 'string' ||
    typeof item_name !== 'string' ||
    typeof unit !== 'string'
  ) {
    return null;
  }

  return {
    item: normalizePurchasePrintItemRelation(item),
    id,
    item_id,
    item_name,
    quantity: toFiniteNumber(quantity),
    price: toFiniteNumber(price),
    discount: toFiniteNumber(discount),
    subtotal: toFiniteNumber(subtotal),
    unit,
    inventory_unit_id: toNullableString(inventory_unit_id),
    unit_id: toNullableString(unit_id),
    vat_percentage: toFiniteNumber(vat_percentage),
    batch_no: toNullableString(batch_no),
    expiry_date: toNullableString(expiry_date),
    unit_conversion_rate: toFiniteNumber(unit_conversion_rate, 1),
  };
};

export const normalizePurchasePrintItems = (value: unknown): PurchaseItem[] =>
  Array.isArray(value)
    ? value.flatMap(item => {
        const normalizedItem = normalizePurchasePrintItem(item);
        return normalizedItem ? [normalizedItem] : [];
      })
    : [];

export const normalizePurchasePrintSubtotals = (
  value: unknown
): Subtotals | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    baseTotal: toFiniteNumber(value.baseTotal),
    discountTotal: toFiniteNumber(value.discountTotal),
    afterDiscountTotal: toFiniteNumber(value.afterDiscountTotal),
    vatTotal: toFiniteNumber(value.vatTotal),
    grandTotal: toFiniteNumber(value.grandTotal),
  };
};

export const parsePurchasePrintSessionValue = (
  rawValue: string | null
): PurchasePrintSessionData => {
  if (!rawValue) {
    return EMPTY_PURCHASE_PRINT_SESSION;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isObjectRecord(parsedValue)) {
      return EMPTY_PURCHASE_PRINT_SESSION;
    }

    const purchase = normalizePurchasePrintPurchase(parsedValue.purchase);
    const items = normalizePurchasePrintItems(parsedValue.items);
    const subtotals =
      normalizePurchasePrintSubtotals(parsedValue.subtotals) ??
      (purchase ? calculatePurchaseDocumentSubtotals(purchase, items) : null);

    return {
      purchase,
      items,
      subtotals,
    };
  } catch {
    return EMPTY_PURCHASE_PRINT_SESSION;
  }
};

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
