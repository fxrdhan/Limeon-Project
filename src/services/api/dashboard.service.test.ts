import { describe, expect, it } from 'vite-plus/test';
import {
  mapRecentDashboardTransactions,
  normalizeDashboardSummaryRow,
  normalizeLowStockDashboardItems,
  normalizeRecentPurchaseRows,
  normalizeRecentSaleRows,
} from './dashboard.service';

describe('dashboard summary normalization', () => {
  it('normalizes numeric summary fields and rejects non-record payloads', () => {
    expect(normalizeDashboardSummaryRow(null)).toBeNull();
    expect(
      normalizeDashboardSummaryRow({
        total_sales: '10',
        total_purchases: 20,
        total_medicines: undefined,
        low_stock_count: 'not-a-number',
        current_month_sales: 30,
        previous_month_sales: null,
      })
    ).toEqual({
      total_sales: '10',
      total_purchases: 20,
      total_medicines: null,
      low_stock_count: 'not-a-number',
      current_month_sales: 30,
      previous_month_sales: null,
    });
  });
});

describe('dashboard recent transaction normalization', () => {
  it('drops rows without required identity/date fields and coerces totals', () => {
    expect(
      normalizeRecentSaleRows([
        {
          id: 'sale-1',
          invoice_number: 'S-001',
          date: '2026-06-15T08:00:00.000Z',
          total: '12500',
          patients: { name: 'Budi' },
        },
        {
          id: 'missing-date',
          total: 10,
        },
      ])
    ).toEqual([
      {
        id: 'sale-1',
        invoice_number: 'S-001',
        date: '2026-06-15T08:00:00.000Z',
        total: 12500,
        patients: { name: 'Budi' },
      },
    ]);
  });

  it('normalizes relation arrays and falls back on malformed totals', () => {
    expect(
      normalizeRecentPurchaseRows([
        {
          id: 'purchase-1',
          invoice_number: null,
          date: '2026-06-15T08:00:00.000Z',
          total: 'invalid',
          suppliers: [{ name: 12 }, { name: 'Supplier A' }],
        },
      ])
    ).toEqual([
      {
        id: 'purchase-1',
        invoice_number: null,
        date: '2026-06-15T08:00:00.000Z',
        total: 0,
        suppliers: [{ name: null }, { name: 'Supplier A' }],
      },
    ]);
  });
});

describe('dashboard low stock normalization', () => {
  it('normalizes relation fields to arrays and drops rows without identity fields', () => {
    expect(
      normalizeLowStockDashboardItems([
        {
          id: 'item-1',
          name: 'Paracetamol',
          stock: '7',
          item_categories: { name: 'Obat' },
          item_types: [{ name: 'Tablet' }],
          item_packages: null,
        },
        {
          id: 'missing-name',
          stock: 2,
        },
      ])
    ).toEqual([
      {
        id: 'item-1',
        name: 'Paracetamol',
        stock: 7,
        item_categories: [{ name: 'Obat' }],
        item_types: [{ name: 'Tablet' }],
        item_packages: [],
      },
    ]);
  });
});

describe('dashboard recent transaction mapping', () => {
  it('normalizes counterparties from single or array relations and sorts by date', () => {
    expect(
      mapRecentDashboardTransactions(
        [
          {
            id: 'sale-older',
            invoice_number: 'S-001',
            date: '2026-06-14T08:00:00.000Z',
            total: 10000,
            patients: [{ name: 'Budi' }],
          },
          {
            id: 'sale-newer',
            invoice_number: 'S-002',
            date: '2026-06-15T08:00:00.000Z',
            total: 20000,
            patients: null,
          },
        ],
        [
          {
            id: 'purchase-middle',
            invoice_number: 'P-001',
            date: '2026-06-14T12:00:00.000Z',
            total: 15000,
            suppliers: { name: 'Supplier A' },
          },
        ],
        3
      )
    ).toEqual([
      expect.objectContaining({
        id: 'sale-newer',
        type: 'sale',
        counterparty: 'Walk-in Customer',
      }),
      expect.objectContaining({
        id: 'purchase-middle',
        type: 'purchase',
        counterparty: 'Supplier A',
      }),
      expect.objectContaining({
        id: 'sale-older',
        type: 'sale',
        counterparty: 'Budi',
      }),
    ]);
  });

  it('uses supplier fallback and respects the requested limit', () => {
    expect(
      mapRecentDashboardTransactions(
        [],
        [
          {
            id: 'purchase-1',
            date: '2026-06-15T08:00:00.000Z',
            total: 10000,
            suppliers: [],
          },
          {
            id: 'purchase-2',
            date: '2026-06-14T08:00:00.000Z',
            total: 9000,
            suppliers: { name: 'Supplier B' },
          },
        ],
        1
      )
    ).toEqual([
      expect.objectContaining({
        id: 'purchase-1',
        counterparty: 'Unknown Supplier',
      }),
    ]);
  });
});
