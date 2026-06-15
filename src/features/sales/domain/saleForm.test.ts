import { describe, expect, it } from 'vite-plus/test';
import type {
  Item,
  ItemInventoryUnit,
  SaleFormData,
  SaleItem,
} from '../../../types';
import {
  buildSaleItemFromItem,
  buildSaleCreatePayload,
  buildSaleItemCreatePayloads,
  calculateSaleTotal,
  updateSaleItemAmount,
  updateSaleItemUnit,
  validateSaleForm,
} from './saleForm';

const baseFormData: SaleFormData = {
  customer_id: '',
  patient_id: '',
  doctor_id: '',
  invoice_number: '',
  date: '2026-06-15',
  payment_method: 'cash',
};

const createSaleItem = (overrides: Partial<SaleItem> = {}): SaleItem => ({
  id: 'line-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 5_000,
  subtotal: 10_000,
  unit_name: 'Strip',
  inventory_unit_id: 'unit-strip',
  unit_id: null,
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
  base_price: 3_000,
  sell_price: 5_000,
  stock: 10,
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
      base_price: 3_000,
      sell_price: 5_000,
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
      base_price: 30_000,
      sell_price: 50_000,
    },
  ],
  category: { name: 'Analgesik' },
  type: { name: 'Obat' },
  package: { name: 'Dus' },
  unit: { name: 'Strip' },
  ...overrides,
});

describe('sale form domain helpers', () => {
  it('builds a sale item from the item base inventory unit', () => {
    expect(buildSaleItemFromItem(createItem(), 'sale-line-1')).toMatchObject({
      id: 'sale-line-1',
      item_id: 'item-1',
      item_name: 'Paracetamol',
      quantity: 1,
      price: 5_000,
      subtotal: 5_000,
      unit_name: 'Strip',
      inventory_unit_id: 'unit-strip',
      unit_id: null,
      unit_conversion_rate: 1,
      item: {
        name: 'Paracetamol',
        code: 'PCT',
      },
    });
  });

  it('falls back to item display unit when no base inventory unit exists', () => {
    expect(
      buildSaleItemFromItem(
        createItem({
          code: undefined,
          base_inventory_unit_id: null,
          base_unit: 'Tablet',
          inventory_units: [],
          sell_price: 2_500,
          unit: { name: 'Tablet' },
        }),
        'sale-line-1'
      )
    ).toMatchObject({
      item: {
        code: '',
      },
      unit_name: 'Tablet',
      inventory_unit_id: null,
      price: 2_500,
      subtotal: 2_500,
      unit_conversion_rate: 1,
    });
  });

  it('keeps sale total derived from item subtotals', () => {
    expect(
      calculateSaleTotal([
        createSaleItem({ subtotal: 10_000 }),
        createSaleItem({ id: 'line-2', subtotal: 7_500 }),
      ])
    ).toBe(17_500);
  });

  it('recalculates subtotal when quantity or price changes', () => {
    const byQuantity = updateSaleItemAmount(
      [createSaleItem()],
      'line-1',
      'quantity',
      3
    );
    const byPrice = updateSaleItemAmount(byQuantity, 'line-1', 'price', 6_000);

    expect(byQuantity[0]).toMatchObject({
      quantity: 3,
      price: 5_000,
      subtotal: 15_000,
    });
    expect(byPrice[0]).toMatchObject({
      quantity: 3,
      price: 6_000,
      subtotal: 18_000,
    });
  });

  it('updates unit fields from the selected inventory unit', () => {
    const updatedItems = updateSaleItemUnit(
      [createSaleItem()],
      'line-1',
      'Box',
      () => createItem()
    );

    expect(updatedItems[0]).toMatchObject({
      unit_name: 'Box',
      inventory_unit_id: 'unit-box',
      unit_id: null,
      price: 50_000,
      subtotal: 100_000,
      unit_conversion_rate: 10,
    });
  });

  it('keeps the existing inventory unit when the requested unit name is absent', () => {
    const updatedItems = updateSaleItemUnit(
      [createSaleItem({ inventory_unit_id: 'unit-strip' })],
      'line-1',
      'Tidak Ada',
      () => createItem()
    );

    expect(updatedItems[0]).toMatchObject({
      unit_name: 'Tidak Ada',
      inventory_unit_id: 'unit-strip',
      price: 5_000,
      subtotal: 10_000,
      unit_conversion_rate: 1,
    });
  });

  it('preserves sale validation messages and order', () => {
    const errors = validateSaleForm({
      formData: {
        ...baseFormData,
        date: '15-06-2026',
        payment_method: '',
      },
      saleItems: [
        createSaleItem({
          item_id: '',
          unit_name: '',
          quantity: 0,
          price: -1,
          unit_conversion_rate: 0,
        }),
      ],
      getItemById: () => undefined,
    });

    expect(errors).toEqual([
      'Tanggal penjualan tidak valid (YYYY-MM-DD).',
      'Metode pembayaran wajib diisi.',
      'Paracetamol: item tidak valid.',
      'Paracetamol: satuan harus diisi.',
      'Paracetamol: kuantitas harus lebih besar dari 0.',
      'Paracetamol: harga tidak boleh negatif.',
      'Paracetamol: konversi satuan tidak valid.',
    ]);
  });

  it('rejects sale quantities that exceed available base stock', () => {
    const errors = validateSaleForm({
      formData: baseFormData,
      saleItems: [createSaleItem({ quantity: 3, unit_conversion_rate: 5 })],
      getItemById: () => createItem({ stock: 10 }),
    });

    expect(errors).toEqual(['Paracetamol: stok tidak mencukupi.']);
  });

  it('builds create-sale payloads with existing optional-id semantics', () => {
    expect(
      buildSaleCreatePayload(
        {
          customer_id: '',
          patient_id: 'patient-1',
          doctor_id: '',
          invoice_number: 'INV-001',
          date: '2026-06-15',
          payment_method: 'card',
        },
        10_000
      )
    ).toEqual({
      customer_id: undefined,
      patient_id: 'patient-1',
      doctor_id: undefined,
      invoice_number: 'INV-001',
      date: '2026-06-15',
      total: 10_000,
      payment_method: 'card',
    });
    expect(buildSaleItemCreatePayloads([createSaleItem()])).toEqual([
      {
        item_id: 'item-1',
        quantity: 2,
        price: 5_000,
        subtotal: 10_000,
        unit_name: 'Strip',
        inventory_unit_id: 'unit-strip',
        unit_id: null,
        unit_conversion_rate: 1,
      },
    ]);
  });
});
