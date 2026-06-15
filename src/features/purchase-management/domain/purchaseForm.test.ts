import { describe, expect, it } from 'vite-plus/test';
import type {
  CompanyProfile,
  Item,
  ItemInventoryUnit,
  PurchaseFormData,
  PurchaseItem,
} from '../../../types';
import {
  appendPurchaseItem,
  buildPurchaseCreatePayload,
  buildPurchaseItemCreatePayloads,
  buildPurchaseItemFromItem,
  calculatePurchaseTotal,
  calculatePurchaseTotalVat,
  formatPurchaseValidationMessage,
  normalizePurchaseItemForForm,
  updatePurchaseItemAmount,
  updatePurchaseItemBatchNo,
  updatePurchaseItemExpiry,
  updatePurchaseItemUnit,
  updatePurchaseItemVat,
} from './purchaseForm';

const baseFormData: PurchaseFormData = {
  supplier_id: 'supplier-1',
  invoice_number: 'INV-001',
  date: '2026-06-15',
  due_date: '',
  payment_status: 'unpaid',
  payment_method: 'cash',
  notes: '',
  vat_percentage: 11,
  is_vat_included: true,
};

const companyProfile: CompanyProfile = {
  id: 'company-1',
  name: 'Apotek Sehat',
  address: 'Jl. Merdeka',
  phone: null,
  email: null,
  website: null,
  tax_id: null,
  pharmacist_name: null,
  pharmacist_license: null,
};

const createPurchaseItem = (
  overrides: Partial<PurchaseItem> = {}
): PurchaseItem => ({
  id: 'line-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 10_000,
  discount: 10,
  subtotal: 18_000,
  unit: 'Strip',
  inventory_unit_id: 'unit-strip',
  unit_id: null,
  vat_percentage: 11,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
  item: {
    name: 'Paracetamol',
    code: 'PCT',
  },
  ...overrides,
});

const createInventoryUnit = (
  overrides: Partial<ItemInventoryUnit> = {}
): ItemInventoryUnit => ({
  id: 'unit-strip',
  code: 'STR',
  name: 'Strip',
  kind: 'retail_unit',
  description: null,
  ...overrides,
});

const createItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'item-1',
  name: 'Paracetamol',
  manufacturer: { name: 'Generic' },
  code: 'PCT',
  base_price: 10_000,
  sell_price: 12_000,
  stock: 20,
  base_inventory_unit_id: 'unit-strip',
  package_conversions: [],
  inventory_units: [
    {
      id: 'hierarchy-strip',
      item_id: 'item-1',
      inventory_unit_id: 'unit-strip',
      parent_inventory_unit_id: null,
      contains_quantity: 1,
      factor_to_base: 1,
      unit: createInventoryUnit(),
      parent_unit: null,
      base_price: 10_000,
      sell_price: 12_000,
    },
    {
      id: 'hierarchy-box',
      item_id: 'item-1',
      inventory_unit_id: 'unit-box',
      parent_inventory_unit_id: 'unit-strip',
      contains_quantity: 10,
      factor_to_base: 10,
      unit: createInventoryUnit({
        id: 'unit-box',
        code: 'BOX',
        name: 'Box',
        kind: 'packaging',
      }),
      parent_unit: createInventoryUnit(),
      base_price: 95_000,
      sell_price: 120_000,
    },
  ],
  category: { name: 'Analgesik' },
  type: { name: 'Obat' },
  package: { name: 'Dus' },
  unit: { name: 'Strip' },
  ...overrides,
});

describe('purchase form domain helpers', () => {
  it('builds a purchase item from the item base inventory unit', () => {
    expect(buildPurchaseItemFromItem(createItem(), 'purchase-line-1')).toEqual({
      id: 'purchase-line-1',
      item_id: 'item-1',
      item_name: 'Paracetamol',
      quantity: 1,
      price: 10_000,
      discount: 0,
      subtotal: 10_000,
      unit: 'Strip',
      inventory_unit_id: 'unit-strip',
      unit_id: null,
      vat_percentage: 0,
      batch_no: null,
      expiry_date: null,
      unit_conversion_rate: 1,
      item: {
        name: 'Paracetamol',
        code: 'PCT',
      },
    });
  });

  it('normalizes new purchase items before recalculation', () => {
    const incompleteItem = createPurchaseItem({ unit: '' });
    Object.assign(incompleteItem, {
      batch_no: undefined,
      expiry_date: undefined,
      unit_conversion_rate: undefined,
      unit_id: undefined,
      vat_percentage: undefined,
    });

    const normalized = normalizePurchaseItemForForm(incompleteItem);

    expect(normalized).toMatchObject({
      unit: 'Unit',
      unit_id: null,
      vat_percentage: 0,
      batch_no: null,
      expiry_date: null,
      unit_conversion_rate: 1,
    });
  });

  it('appends and recalculates a new purchase item', () => {
    const appended = appendPurchaseItem(
      [],
      createPurchaseItem({
        discount: 10,
        price: 10_000,
        quantity: 2,
        subtotal: 0,
        vat_percentage: 11,
      }),
      false
    );

    expect(appended[0]?.subtotal).toBe(19_980);
  });

  it('recalculates subtotal when editable numeric item fields change', () => {
    const updated = updatePurchaseItemAmount(
      [createPurchaseItem()],
      'line-1',
      'quantity',
      3,
      false
    );

    expect(updated[0]).toMatchObject({
      quantity: 3,
      price: 10_000,
      discount: 10,
      subtotal: 29_970,
    });
  });

  it('recalculates subtotal when item VAT changes', () => {
    const updated = updatePurchaseItemVat(
      [createPurchaseItem({ vat_percentage: 0 })],
      'line-1',
      11,
      false
    );

    expect(updated[0]).toMatchObject({
      vat_percentage: 11,
      subtotal: 19_980,
    });
  });

  it('updates expiry date and batch number fields immutably', () => {
    const withExpiry = updatePurchaseItemExpiry(
      [createPurchaseItem()],
      'line-1',
      '2027-01-31'
    );
    const withBatch = updatePurchaseItemBatchNo(
      withExpiry,
      'line-1',
      'BATCH-7'
    );

    expect(withBatch[0]).toMatchObject({
      expiry_date: '2027-01-31',
      batch_no: 'BATCH-7',
    });
  });

  it('preserves existing inventory-unit precedence during unit changes', () => {
    const updated = updatePurchaseItemUnit(
      [createPurchaseItem({ inventory_unit_id: 'unit-strip' })],
      'line-1',
      'Box',
      () => createItem()
    );

    expect(updated[0]).toMatchObject({
      unit: 'Box',
      inventory_unit_id: 'unit-strip',
      unit_id: null,
      price: 10_000,
      subtotal: 18_000,
      unit_conversion_rate: 1,
    });
  });

  it('uses the requested unit when there is no existing inventory-unit match', () => {
    const updated = updatePurchaseItemUnit(
      [createPurchaseItem({ inventory_unit_id: null })],
      'line-1',
      'Box',
      () => createItem()
    );

    expect(updated[0]).toMatchObject({
      unit: 'Box',
      inventory_unit_id: 'unit-box',
      price: 95_000,
      subtotal: 171_000,
      unit_conversion_rate: 10,
    });
  });

  it('calculates purchase totals and VAT totals through existing financial rules', () => {
    const items = [createPurchaseItem()];

    expect(calculatePurchaseTotal(items)).toBe(18_000);
    expect(calculatePurchaseTotalVat(items, false)).toBe(1_980);
    expect(calculatePurchaseTotalVat(items, true)).toBe(1_783.78);
  });

  it('formats validation messages with existing item prefixes and fallback copy', () => {
    expect(
      formatPurchaseValidationMessage({
        isValid: false,
        formErrors: ['Nomor faktur wajib diisi.'],
        itemErrors: [
          {
            id: 'line-1',
            errors: ['Harga tidak boleh negatif.'],
          },
        ],
      })
    ).toBe(
      'Nomor faktur wajib diisi.\nItem line-1: Harga tidak boleh negatif.'
    );

    expect(
      formatPurchaseValidationMessage({
        isValid: false,
        formErrors: [],
        itemErrors: [],
      })
    ).toBe('Form tidak valid.');
  });

  it('builds purchase create payloads with existing null and undefined semantics', () => {
    expect(
      buildPurchaseCreatePayload({
        companyProfile,
        formData: {
          ...baseFormData,
          due_date: '',
          notes: '',
        },
        total: 18_000,
        vatAmount: 1_980,
      })
    ).toEqual({
      supplier_id: 'supplier-1',
      invoice_number: 'INV-001',
      date: '2026-06-15',
      total: 18_000,
      payment_status: 'unpaid',
      payment_method: 'cash',
      vat_percentage: 11,
      is_vat_included: true,
      vat_amount: 1_980,
      notes: null,
      due_date: null,
      customer_name: 'Apotek Sehat',
      customer_address: 'Jl. Merdeka',
    });

    expect(buildPurchaseItemCreatePayloads([createPurchaseItem()])).toEqual([
      {
        item_id: 'item-1',
        quantity: 2,
        discount: 10,
        price: 10_000,
        subtotal: 18_000,
        unit: 'Strip',
        unit_id: null,
        unit_conversion_rate: 1,
        vat_percentage: 11,
        batch_no: null,
        expiry_date: null,
      },
    ]);
  });
});
