import { getBaseItemUnit, resolveItemUnitEntry } from '@/lib/item-units';
import type { Item, SaleFormData, SaleItem } from '@/types';

export type SaleItemAmountField = 'quantity' | 'price';

export interface SaleCreatePayload {
  customer_id?: string;
  patient_id?: string;
  doctor_id?: string;
  invoice_number?: string;
  date: string;
  total: number;
  payment_method: string;
}

export interface SaleItemCreatePayload {
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_name: string;
  inventory_unit_id?: string | null;
  unit_id?: string | null;
  unit_conversion_rate: number;
}

const isValidISODate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const calculateSaleTotal = (saleItems: SaleItem[]) =>
  saleItems.reduce((sum, item) => sum + item.subtotal, 0);

export const updateSaleItemAmount = (
  saleItems: SaleItem[],
  id: string,
  field: SaleItemAmountField,
  value: number
) =>
  saleItems.map(item => {
    if (item.id !== id) return item;

    const quantity = field === 'quantity' ? value : item.quantity;
    const price = field === 'price' ? value : item.price;

    return {
      ...item,
      [field]: value,
      subtotal: quantity * price,
    };
  });

export const updateSaleItemUnit = (
  saleItems: SaleItem[],
  id: string,
  unitName: string,
  getItemById: (itemId: string) => Item | undefined
) =>
  saleItems.map(item => {
    if (item.id !== id) return item;

    const itemData = getItemById(item.item_id);
    if (!itemData) return item;

    const selectedUnit =
      resolveItemUnitEntry(
        itemData.inventory_units || [],
        undefined,
        unitName
      ) ||
      resolveItemUnitEntry(
        itemData.inventory_units || [],
        item.inventory_unit_id,
        undefined
      );

    const price = selectedUnit?.sell_price || itemData.sell_price;
    const conversionRate = selectedUnit?.factor_to_base || 1;

    return {
      ...item,
      unit_name: unitName,
      inventory_unit_id:
        selectedUnit?.inventory_unit_id ||
        itemData.base_inventory_unit_id ||
        null,
      unit_id: null,
      price,
      subtotal: price * item.quantity,
      unit_conversion_rate: conversionRate,
    };
  });

export const buildSaleItemFromItem = (
  itemData: Item,
  saleItemId: string
): SaleItem => {
  const baseInventoryUnit = getBaseItemUnit(itemData);
  const unitName =
    baseInventoryUnit?.unit.name ||
    itemData.unit?.name ||
    itemData.base_unit ||
    'Unit';
  const sellPrice = baseInventoryUnit?.sell_price || itemData.sell_price;

  return {
    id: saleItemId,
    item_id: itemData.id,
    item_name: itemData.name,
    quantity: 1,
    price: sellPrice,
    subtotal: sellPrice,
    unit_name: unitName,
    inventory_unit_id:
      baseInventoryUnit?.inventory_unit_id ||
      itemData.base_inventory_unit_id ||
      null,
    unit_id: null,
    unit_conversion_rate: baseInventoryUnit?.factor_to_base || 1,
    item: {
      name: itemData.name,
      code: itemData.code || '',
    },
  };
};

export const validateSaleForm = ({
  formData,
  saleItems,
  getItemById,
}: {
  formData: SaleFormData;
  saleItems: SaleItem[];
  getItemById: (id: string) => Item | undefined;
}) => {
  const errors: string[] = [];

  if (!formData.date.trim() || !isValidISODate(formData.date)) {
    errors.push('Tanggal penjualan tidak valid (YYYY-MM-DD).');
  }

  if (!formData.payment_method.trim()) {
    errors.push('Metode pembayaran wajib diisi.');
  }

  if (saleItems.length === 0) {
    errors.push('Minimal harus ada satu item penjualan.');
  }

  for (const item of saleItems) {
    if (!item.item_id) errors.push(`${item.item_name}: item tidak valid.`);
    if (!item.unit_name.trim()) {
      errors.push(`${item.item_name}: satuan harus diisi.`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push(`${item.item_name}: kuantitas harus lebih besar dari 0.`);
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      errors.push(`${item.item_name}: harga tidak boleh negatif.`);
    }
    if (
      !Number.isFinite(item.unit_conversion_rate) ||
      item.unit_conversion_rate <= 0
    ) {
      errors.push(`${item.item_name}: konversi satuan tidak valid.`);
    }

    const itemData = getItemById(item.item_id);
    if (itemData) {
      const requestedStock = item.quantity * item.unit_conversion_rate;
      if (requestedStock > itemData.stock) {
        errors.push(`${item.item_name}: stok tidak mencukupi.`);
      }
    }
  }

  return errors;
};

export const buildSaleCreatePayload = (
  formData: SaleFormData,
  total: number
): SaleCreatePayload => ({
  customer_id: formData.customer_id || undefined,
  patient_id: formData.patient_id || undefined,
  doctor_id: formData.doctor_id || undefined,
  invoice_number: formData.invoice_number || undefined,
  date: formData.date,
  total,
  payment_method: formData.payment_method,
});

export const buildSaleItemCreatePayloads = (
  saleItems: SaleItem[]
): SaleItemCreatePayload[] =>
  saleItems.map(item => ({
    item_id: item.item_id,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
    unit_name: item.unit_name,
    inventory_unit_id: item.inventory_unit_id,
    unit_id: item.unit_id,
    unit_conversion_rate: item.unit_conversion_rate,
  }));
