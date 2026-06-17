import { describe, expect, it } from 'vite-plus/test';
import {
  mapPurchaseDetail,
  mapPurchaseItem,
  mapPurchaseListItem,
} from './purchases.service';

describe('purchase service mappers', () => {
  it('normalizes paginated purchase supplier relations from arrays', () => {
    expect(
      mapPurchaseListItem({
        id: 'purchase-1',
        invoice_number: 'P-001',
        date: '2026-06-15',
        total: 125000,
        payment_status: 'paid',
        payment_method: 'cash',
        supplier: [{ name: 'Supplier A' }],
      })
    ).toEqual({
      id: 'purchase-1',
      invoice_number: 'P-001',
      date: '2026-06-15',
      total: 125000,
      payment_status: 'paid',
      payment_method: 'cash',
      supplier: { name: 'Supplier A' },
    });

    expect(
      mapPurchaseListItem({
        id: 'purchase-2',
        invoice_number: 'P-002',
        date: '2026-06-16',
        total: 250000,
        payment_status: 'unpaid',
        payment_method: 'transfer',
        supplier: [],
      }).supplier
    ).toBeNull();
  });

  it('maps purchase details with stable supplier fallbacks', () => {
    expect(
      mapPurchaseDetail({
        id: 'purchase-1',
        invoice_number: 'P-001',
        supplier_id: 'supplier-1',
        date: '2026-06-15',
        due_date: null,
        total: 125000,
        payment_status: 'paid',
        payment_method: 'cash',
        vat_percentage: 11,
        is_vat_included: true,
        vat_amount: 12376,
        notes: null,
        suppliers: [
          {
            name: 'Supplier A',
            address: 'Jl. Mawar',
            contact_person: null,
          },
        ],
      })
    ).toMatchObject({
      id: 'purchase-1',
      supplier: {
        name: 'Supplier A',
        address: 'Jl. Mawar',
        contact_person: null,
      },
    });

    expect(
      mapPurchaseDetail({
        id: 'purchase-2',
        invoice_number: 'P-002',
        supplier_id: 'supplier-2',
        date: '2026-06-16',
        due_date: null,
        total: 250000,
        payment_status: 'unpaid',
        payment_method: 'transfer',
        vat_percentage: 0,
        is_vat_included: false,
        vat_amount: 0,
        notes: null,
        suppliers: [],
      }).supplier
    ).toEqual({
      name: '',
      address: null,
      contact_person: null,
    });
  });

  it('maps purchase item relation fields and unit fallbacks', () => {
    expect(
      mapPurchaseItem({
        id: 'purchase-item-1',
        purchase_id: 'purchase-1',
        item_id: 'item-1',
        quantity: 2,
        price: 5000,
        discount: 0,
        subtotal: 10000,
        unit: 'Strip',
        unit_id: 'legacy-unit',
        vat_percentage: 11,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: '12',
        items: [{ id: 'item-1', name: 'Paracetamol', code: 'PRC' }],
      })
    ).toMatchObject({
      item_name: 'Paracetamol',
      item: {
        name: 'Paracetamol',
        code: 'PRC',
      },
      inventory_unit_id: 'legacy-unit',
      unit_id: 'legacy-unit',
      unit_conversion_rate: 12,
    });

    expect(
      mapPurchaseItem({
        id: 'purchase-item-2',
        purchase_id: 'purchase-1',
        item_id: 'item-2',
        quantity: 1,
        price: 5000,
        discount: 0,
        subtotal: 5000,
        unit: 'Pcs',
        vat_percentage: 0,
        batch_no: null,
        expiry_date: null,
        unit_conversion_rate: null,
        items: [],
      })
    ).toMatchObject({
      item_name: '',
      item: {
        name: '',
        code: '',
      },
      inventory_unit_id: null,
      unit_id: null,
      unit_conversion_rate: 1,
    });
  });
});
