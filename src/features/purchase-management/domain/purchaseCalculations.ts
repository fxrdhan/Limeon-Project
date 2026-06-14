import type { PurchaseItem, PurchaseFormData, Subtotals } from '@/types';

/**
 * Purchase calculation utilities and validations
 * - Pure functions (no side effects, no I/O)
 * - Centralizes business rules for purchase calculations (SRP)
 */

/* =========================
 * Helpers
 * ========================= */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals = 2): number {
  const p = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * p) / p;
}

function isValidISODate(value: string | null | undefined): boolean {
  if (!value) return true; // optional field is valid if empty
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/* =========================
 * Core Calculations
 * ========================= */

/**
 * Compute base, discount, net after discount, VAT amount, and subtotal for a single line item.
 *
 * VAT handling:
 * - If isVatIncluded = false, subtotal includes VAT (added on top of after-discount price)
 * - If isVatIncluded = true, subtotal excludes VAT (we treat the price as VAT-inclusive from supplier)
 *
 * Note:
 * - This mirrors a common UI expectation: display subtotal (excl. VAT) when "VAT included",
 *   and display subtotal (incl. VAT) when "VAT excluded".
 * - VAT amount is computed for reporting regardless of inclusion mode.
 */
export function computeItemFinancials(
  item: Pick<
    PurchaseItem,
    'quantity' | 'price' | 'discount' | 'vat_percentage'
  >,
  isVatIncluded: boolean
): {
  base: number;
  discountAmount: number;
  afterDiscount: number;
  vatAmount: number;
  subtotal: number;
} {
  const qty = Math.max(0, item.quantity || 0);
  const price = Math.max(0, item.price || 0);
  const discountPct = clamp(item.discount || 0, 0, 100);
  const vatPct = Math.max(0, item.vat_percentage || 0);

  const base = qty * price;

  const discountAmount = base * (discountPct / 100);
  const afterDiscount = base - discountAmount;

  let vatAmount = 0;
  if (vatPct > 0) {
    if (isVatIncluded) {
      // When price is VAT-inclusive, infer VAT component from afterDiscount
      // VAT = afterDiscount - (afterDiscount / (1 + vat%))
      const exclusive = afterDiscount / (1 + vatPct / 100);
      vatAmount = afterDiscount - exclusive;
    } else {
      // When VAT is not included in price, add it on top
      vatAmount = afterDiscount * (vatPct / 100);
    }
  }

  // Subtotal behavior for display consistency:
  // - If VAT included: display "after discount" (exclusive of VAT)
  // - If VAT excluded: display "after discount + VAT"
  const subtotal = isVatIncluded ? afterDiscount : afterDiscount + vatAmount;

  return {
    base: roundTo(base),
    discountAmount: roundTo(discountAmount),
    afterDiscount: roundTo(afterDiscount),
    vatAmount: roundTo(vatAmount),
    subtotal: roundTo(subtotal),
  };
}

/**
 * Recalculate subtotals for a list of items.
 * Returns a new array (non-mutating).
 */
export function recalculateItems(
  items: PurchaseItem[],
  isVatIncluded: boolean
): PurchaseItem[] {
  return items.map(item => {
    const { subtotal } = computeItemFinancials(item, isVatIncluded);
    return {
      ...item,
      subtotal,
      vat_percentage: item.vat_percentage ?? 0,
      unit: item.unit || 'Unit',
      unit_conversion_rate: item.unit_conversion_rate || 1,
      batch_no: item.batch_no ?? null,
      expiry_date: item.expiry_date ?? null,
    };
  });
}

/**
 * Compute aggregate subtotals for display/printing.
 *
 * Subtotals definition:
 * - baseTotal = sum(qty * price)
 * - discountTotal = sum(discount amounts)
 * - afterDiscountTotal = baseTotal - discountTotal
 * - vatTotal = total VAT amount (derived per item)
 * - grandTotal = afterDiscountTotal + (VAT if isVatIncluded = false)
 */
export function calculateSubtotals(
  items: PurchaseItem[],
  isVatIncluded: boolean
): Subtotals {
  let baseTotal = 0;
  let discountTotal = 0;
  let afterDiscountTotal = 0;
  let vatTotal = 0;

  for (const item of items) {
    const { base, discountAmount, afterDiscount, vatAmount } =
      computeItemFinancials(item, isVatIncluded);
    baseTotal += base;
    discountTotal += discountAmount;
    afterDiscountTotal += afterDiscount;
    vatTotal += vatAmount;
  }

  const grandTotal = isVatIncluded
    ? afterDiscountTotal
    : afterDiscountTotal + vatTotal;

  return {
    baseTotal: roundTo(baseTotal),
    discountTotal: roundTo(discountTotal),
    afterDiscountTotal: roundTo(afterDiscountTotal),
    vatTotal: roundTo(vatTotal),
    grandTotal: roundTo(grandTotal),
  };
}

/* =========================
 * Validations
 * ========================= */

export interface ItemValidationError {
  id: string;
  errors: string[];
}

export interface PurchaseValidationResult {
  isValid: boolean;
  formErrors: string[];
  itemErrors: ItemValidationError[];
}

/**
 * Validate a single purchase item for basic business constraints.
 */
export function validatePurchaseItem(item: PurchaseItem): string[] {
  const errors: string[] = [];

  if (!item.item_id) errors.push('Item belum dipilih.');
  if (!item.item_name?.trim()) errors.push('Nama item tidak valid.');
  if (!item.unit?.trim()) errors.push('Satuan harus diisi.');
  if (!Number.isFinite(item.quantity) || item.quantity <= 0)
    errors.push('Kuantitas harus lebih besar dari 0.');
  if (!Number.isFinite(item.price) || item.price < 0)
    errors.push('Harga tidak boleh negatif.');
  if (
    !Number.isFinite(item.discount) ||
    item.discount < 0 ||
    item.discount > 100
  )
    errors.push('Diskon harus di antara 0–100%.');
  if (
    !Number.isFinite(item.vat_percentage) ||
    item.vat_percentage < 0 ||
    item.vat_percentage > 100
  )
    errors.push('PPN harus di antara 0–100%.');
  if (
    !Number.isFinite(item.unit_conversion_rate) ||
    item.unit_conversion_rate <= 0
  )
    errors.push('Konversi satuan tidak valid.');
  if (!isValidISODate(item.expiry_date))
    errors.push('Format tanggal kadaluwarsa harus YYYY-MM-DD.');

  return errors;
}

/**
 * Validate purchase form and all items.
 */
export function validatePurchaseForm(
  form: PurchaseFormData,
  items: PurchaseItem[]
): PurchaseValidationResult {
  const formErrors: string[] = [];
  const itemErrors: ItemValidationError[] = [];

  if (!form.invoice_number?.trim())
    formErrors.push('Nomor faktur wajib diisi.');
  if (!form.date?.trim() || !isValidISODate(form.date))
    formErrors.push('Tanggal faktur tidak valid (YYYY-MM-DD).');
  if (form.due_date && !isValidISODate(form.due_date))
    formErrors.push('Tanggal jatuh tempo harus YYYY-MM-DD.');
  if (!form.payment_status?.trim())
    formErrors.push('Status pembayaran wajib diisi.');
  if (!form.payment_method?.trim())
    formErrors.push('Metode pembayaran wajib diisi.');

  if (!Array.isArray(items) || items.length === 0) {
    formErrors.push('Minimal harus ada satu item pembelian.');
  } else {
    for (const it of items) {
      const errors = validatePurchaseItem(it);
      if (errors.length > 0) {
        itemErrors.push({ id: it.id, errors });
      }
    }
  }

  return {
    isValid: formErrors.length === 0 && itemErrors.length === 0,
    formErrors,
    itemErrors,
  };
}
