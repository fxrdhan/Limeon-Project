import {
  computeItemFinancials,
  recalculateItems,
  type PurchaseValidationResult,
} from './purchaseCalculations';
import { getBaseItemUnit, resolveItemUnitEntry } from '@/lib/item-units';
import type {
  CompanyProfile,
  Item,
  PurchaseFormData,
  PurchaseItem,
} from '@/types';

export type PurchaseItemAmountField = 'quantity' | 'price' | 'discount';

export interface PurchaseCreatePayload {
  supplier_id: string;
  invoice_number: string;
  date: string;
  total: number;
  payment_status: string;
  payment_method: string;
  vat_percentage: number;
  is_vat_included: boolean;
  vat_amount: number;
  notes: string | null;
  due_date: string | null;
  customer_name?: string;
  customer_address?: string;
}

export interface PurchaseItemCreatePayload {
  item_id: string;
  quantity: number;
  discount: number;
  price: number;
  subtotal: number;
  unit: string;
  unit_id?: string | null;
  unit_conversion_rate: number;
  vat_percentage: number;
  batch_no: string | null;
  expiry_date: string | null;
}

export const calculatePurchaseTotal = (purchaseItems: PurchaseItem[]) =>
  purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

export const normalizePurchaseItemForForm = (
  newItem: PurchaseItem
): PurchaseItem => ({
  ...newItem,
  vat_percentage: newItem.vat_percentage ?? 0,
  batch_no: newItem.batch_no ?? null,
  expiry_date: newItem.expiry_date ?? null,
  unit: newItem.unit || 'Unit',
  unit_id: newItem.unit_id ?? null,
  unit_conversion_rate: newItem.unit_conversion_rate ?? 1,
});

export const appendPurchaseItem = (
  purchaseItems: PurchaseItem[],
  newItem: PurchaseItem,
  isVatIncluded: boolean
) =>
  recalculateItems(
    [...purchaseItems, normalizePurchaseItemForForm(newItem)],
    isVatIncluded
  );

export const updatePurchaseItemAmount = (
  purchaseItems: PurchaseItem[],
  id: string,
  field: PurchaseItemAmountField,
  value: number,
  isVatIncluded: boolean
) =>
  purchaseItems.map(item => {
    if (item.id !== id) return item;

    const quantity = field === 'quantity' ? value : item.quantity;
    const price = field === 'price' ? value : item.price;
    const discount = field === 'discount' ? value : item.discount;

    let subtotal = quantity * price;
    if (discount > 0) {
      const discountAmount = subtotal * (discount / 100);
      subtotal -= discountAmount;
    }

    if (item.vat_percentage > 0 && !isVatIncluded) {
      const vatAmount = subtotal * (item.vat_percentage / 100);
      subtotal += vatAmount;
    }

    return {
      ...item,
      [field]: value,
      subtotal,
    };
  });

export const updatePurchaseItemVat = (
  purchaseItems: PurchaseItem[],
  id: string,
  vatPercentage: number,
  isVatIncluded: boolean
) =>
  purchaseItems.map(item => {
    if (item.id !== id) return item;

    let subtotal = item.quantity * item.price;
    if (item.discount > 0) {
      const discountAmount = subtotal * (item.discount / 100);
      subtotal -= discountAmount;
    }

    if (vatPercentage > 0 && !isVatIncluded) {
      const vatAmount = subtotal * (vatPercentage / 100);
      subtotal += vatAmount;
    }

    return {
      ...item,
      vat_percentage: vatPercentage,
      subtotal,
    };
  });

export const updatePurchaseItemExpiry = (
  purchaseItems: PurchaseItem[],
  id: string,
  expiryDate: string
) =>
  purchaseItems.map(item =>
    item.id === id ? { ...item, expiry_date: expiryDate } : item
  );

export const updatePurchaseItemBatchNo = (
  purchaseItems: PurchaseItem[],
  id: string,
  batchNo: string
) =>
  purchaseItems.map(item =>
    item.id === id ? { ...item, batch_no: batchNo } : item
  );

export const updatePurchaseItemUnit = (
  purchaseItems: PurchaseItem[],
  id: string,
  unitName: string,
  getItemById: (itemId: string) => Item | undefined
) =>
  purchaseItems.map(item => {
    if (item.id !== id) return item;

    const itemData = getItemById(item.item_id);
    if (!itemData) return item;

    let price = itemData.base_price;
    let conversionRate = 1;
    let inventoryUnitId = itemData.base_inventory_unit_id || null;

    const selectedUnit =
      resolveItemUnitEntry(
        itemData.inventory_units || [],
        item.inventory_unit_id,
        unitName
      ) ||
      resolveItemUnitEntry(itemData.inventory_units || [], undefined, unitName);

    if (selectedUnit) {
      price = selectedUnit.base_price || itemData.base_price;
      conversionRate = selectedUnit.factor_to_base || 1;
      inventoryUnitId = selectedUnit.inventory_unit_id || null;
    }

    const discountAmount = price * item.quantity * (item.discount / 100);

    return {
      ...item,
      unit: unitName,
      inventory_unit_id: inventoryUnitId,
      unit_id: null,
      price,
      subtotal: price * item.quantity - discountAmount,
      unit_conversion_rate: conversionRate,
    };
  });

export const buildPurchaseItemFromItem = (
  itemData: Item,
  purchaseItemId: string
): PurchaseItem => {
  const baseInventoryUnit = getBaseItemUnit(itemData);

  return {
    id: purchaseItemId,
    item_id: itemData.id,
    item_name: itemData.name,
    quantity: 1,
    price: itemData.base_price,
    discount: 0,
    subtotal: itemData.base_price,
    unit:
      baseInventoryUnit?.unit.name ||
      itemData.unit?.name ||
      itemData.base_unit ||
      'Unit',
    inventory_unit_id:
      baseInventoryUnit?.inventory_unit_id ||
      itemData.base_inventory_unit_id ||
      null,
    unit_id: null,
    vat_percentage: 0,
    batch_no: null,
    expiry_date: null,
    unit_conversion_rate: 1,
    item: {
      name: itemData.name,
      code: itemData.code || '',
    },
  };
};

export const calculatePurchaseTotalVat = (
  purchaseItems: PurchaseItem[],
  isVatIncluded: boolean
) =>
  purchaseItems.reduce(
    (total, item) =>
      total + computeItemFinancials(item, isVatIncluded).vatAmount,
    0
  );

export const formatPurchaseValidationMessage = (
  validation: PurchaseValidationResult
) =>
  [
    ...validation.formErrors,
    ...validation.itemErrors.flatMap(itemError =>
      itemError.errors.map(error => `Item ${itemError.id}: ${error}`)
    ),
  ].join('\n') || 'Form tidak valid.';

export const buildPurchaseCreatePayload = ({
  companyProfile,
  formData,
  total,
  vatAmount,
}: {
  companyProfile: CompanyProfile | null;
  formData: PurchaseFormData;
  total: number;
  vatAmount: number;
}): PurchaseCreatePayload => ({
  supplier_id: formData.supplier_id,
  invoice_number: formData.invoice_number,
  date: formData.date,
  total,
  payment_status: formData.payment_status,
  payment_method: formData.payment_method,
  vat_percentage: formData.vat_percentage,
  is_vat_included: formData.is_vat_included,
  vat_amount: vatAmount,
  notes: formData.notes || null,
  due_date: formData.due_date || null,
  customer_name: companyProfile?.name ?? undefined,
  customer_address: companyProfile?.address ?? undefined,
});

export const buildPurchaseItemCreatePayloads = (
  purchaseItems: PurchaseItem[]
): PurchaseItemCreatePayload[] =>
  purchaseItems.map(item => ({
    item_id: item.item_id,
    quantity: item.quantity,
    discount: item.discount,
    price: item.price,
    subtotal: item.subtotal,
    unit: item.unit,
    unit_id: item.unit_id,
    unit_conversion_rate: item.unit_conversion_rate,
    vat_percentage: item.vat_percentage,
    batch_no: item.batch_no,
    expiry_date: item.expiry_date,
  }));
