import { describe, expect, it } from 'vite-plus/test';
import {
  buildSaleRpcItems,
  calculateSalesAnalytics,
  mapSaleItemWithDetails,
  mapSalesListItem,
  mapSaleWithDetails,
} from './sales.mappers';
import type { SaleItemInput } from './sales.types';

describe('sales mappers', () => {
  it('normalizes list relation values returned as arrays or single objects', () => {
    expect(
      mapSalesListItem({
        id: 'sale-1',
        invoice_number: 'INV-001',
        date: '2026-06-13',
        total: 125000,
        payment_method: 'cash',
        patient: [
          {
            id: 'patient-1',
            name: 'Budi',
            phone: '0812',
          },
        ],
        doctor: {
          id: 'doctor-1',
          name: 'Dr. Sari',
          specialization: 'Umum',
        },
        customer: [],
      })
    ).toEqual({
      id: 'sale-1',
      invoice_number: 'INV-001',
      date: '2026-06-13',
      total: 125000,
      payment_method: 'cash',
      patient: {
        id: 'patient-1',
        name: 'Budi',
        phone: '0812',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Sari',
        specialization: 'Umum',
      },
      customer: null,
    });
  });

  it('maps aliased sale detail relations to stable detail fields', () => {
    expect(
      mapSaleWithDetails({
        id: 'sale-1',
        date: '2026-06-13',
        total: 125000,
        payment_method: 'cash',
        patients: {
          id: 'patient-1',
          name: 'Budi',
          phone: '0812',
        },
        doctors: {
          id: 'doctor-1',
          name: 'Dr. Sari',
          specialization: 'Umum',
        },
        customers: {
          id: 'customer-1',
          name: 'Andi',
          phone: null,
        },
        users: {
          id: 'user-1',
          name: 'Admin',
        },
      })
    ).toMatchObject({
      id: 'sale-1',
      patient: {
        id: 'patient-1',
        name: 'Budi',
      },
      doctor: {
        id: 'doctor-1',
        name: 'Dr. Sari',
      },
      customer: {
        id: 'customer-1',
        name: 'Andi',
        phone: null,
      },
      created_by_user: {
        id: 'user-1',
        name: 'Admin',
      },
    });
  });

  it('normalizes sale detail relation arrays to single values', () => {
    expect(
      mapSaleWithDetails({
        id: 'sale-1',
        date: '2026-06-13',
        total: 125000,
        payment_method: 'cash',
        patients: [
          {
            id: 'patient-1',
            name: 'Budi',
            phone: '0812',
          },
        ],
        doctors: [],
        customers: null,
        users: [
          {
            id: 'user-1',
            name: 'Admin',
          },
        ],
      })
    ).toMatchObject({
      patient: {
        id: 'patient-1',
        name: 'Budi',
      },
      doctor: null,
      customer: null,
      created_by_user: {
        id: 'user-1',
        name: 'Admin',
      },
    });
  });

  it('maps sale item details with empty item fallback fields', () => {
    expect(
      mapSaleItemWithDetails({
        id: 'sale-item-1',
        sale_id: 'sale-1',
        item_id: 'item-1',
        quantity: 2,
        price: 5000,
        subtotal: 10000,
        items: null,
      })
    ).toMatchObject({
      id: 'sale-item-1',
      item: {
        id: '',
        name: '',
        code: '',
        manufacturer: '',
      },
    });
  });

  it('builds process_sale_v1 RPC item payloads with nullable unit fields', () => {
    const items: SaleItemInput[] = [
      {
        inventory_unit_id: undefined,
        item_id: 'item-1',
        price: 5000,
        quantity: 2,
        subtotal: 10000,
        unit_id: 'unit-legacy',
        unit_name: 'Tablet',
        unit_conversion_rate: 1,
      },
      {
        inventory_unit_id: 'unit-box',
        item_id: 'item-2',
        price: 60000,
        quantity: 1,
        subtotal: 60000,
        unit_id: undefined,
        unit_name: 'Box',
        unit_conversion_rate: 12,
      },
    ];

    expect(buildSaleRpcItems(items)).toEqual([
      {
        inventory_unit_id: null,
        item_id: 'item-1',
        price: 5000,
        quantity: 2,
        subtotal: 10000,
        unit_id: 'unit-legacy',
        unit_name: 'Tablet',
      },
      {
        inventory_unit_id: 'unit-box',
        item_id: 'item-2',
        price: 60000,
        quantity: 1,
        subtotal: 60000,
        unit_id: null,
        unit_name: 'Box',
      },
    ]);
  });

  it('calculates aggregate sales analytics by payment method', () => {
    expect(
      calculateSalesAnalytics([
        {
          payment_method: 'cash',
          total: '10000',
        },
        {
          payment_method: 'cash',
          total: 15000,
        },
        {
          payment_method: 'transfer',
          total: 25000,
        },
      ])
    ).toEqual({
      averageSale: 50000 / 3,
      paymentMethods: {
        cash: 25000,
        transfer: 25000,
      },
      totalRevenue: 50000,
      totalSales: 3,
    });

    expect(calculateSalesAnalytics([])).toEqual({
      averageSale: 0,
      paymentMethods: {},
      totalRevenue: 0,
      totalSales: 0,
    });
  });
});
