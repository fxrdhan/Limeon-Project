import { describe, expect, it } from 'vite-plus/test';
import type { PurchaseData, PurchaseItem } from '../../../types';
import {
  PURCHASE_PRINT_SESSION_KEY,
  calculatePurchaseDocumentSubtotals,
  formatPurchaseDocumentCurrency,
  getPurchaseDocumentItemCode,
  getPurchaseDocumentItemName,
  getPurchaseDocumentPaymentMethodLabel,
  getPurchaseDocumentPaymentStatusClass,
  getPurchaseDocumentPaymentStatusLabel,
  getPurchaseDocumentPositivePercentageLabel,
  parsePurchasePrintSessionValue,
} from './purchaseDocument';

const makePurchase = (
  overrides: Partial<PurchaseData> = {}
): Pick<PurchaseData, 'is_vat_included'> => ({
  is_vat_included: false,
  ...overrides,
});

const makeFullPurchase = (
  overrides: Partial<PurchaseData> = {}
): PurchaseData => ({
  id: 'purchase-1',
  invoice_number: 'P-001',
  date: '2026-06-15',
  due_date: null,
  total: 19_980,
  payment_status: 'paid',
  payment_method: 'cash',
  vat_percentage: 11,
  is_vat_included: false,
  vat_amount: 1_980,
  notes: null,
  supplier: {
    name: 'Supplier A',
    address: 'Jl. Mawar',
    contact_person: null,
  },
  ...overrides,
});

const makeItem = (overrides: Partial<PurchaseItem> = {}): PurchaseItem => ({
  item: {
    name: 'Paracetamol',
    code: 'PRC',
  },
  id: 'purchase-item-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 10_000,
  discount: 10,
  subtotal: 0,
  unit: 'Strip',
  inventory_unit_id: null,
  unit_id: null,
  vat_percentage: 11,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
  ...overrides,
});

describe('purchase document helpers', () => {
  it('keeps the print route session key stable', () => {
    expect(PURCHASE_PRINT_SESSION_KEY).toBe('purchaseData');
  });

  it('calculates VAT on top when purchase prices exclude VAT', () => {
    expect(
      calculatePurchaseDocumentSubtotals(makePurchase(), [makeItem()])
    ).toEqual({
      baseTotal: 20_000,
      discountTotal: 2_000,
      afterDiscountTotal: 18_000,
      vatTotal: 1_980,
      grandTotal: 19_980,
    });
  });

  it('keeps VAT total at zero when purchase prices include VAT', () => {
    expect(
      calculatePurchaseDocumentSubtotals(
        makePurchase({ is_vat_included: true }),
        [makeItem()]
      )
    ).toEqual({
      baseTotal: 20_000,
      discountTotal: 2_000,
      afterDiscountTotal: 18_000,
      vatTotal: 0,
      grandTotal: 18_000,
    });
  });

  it('formats purchase document currency without adding a currency symbol', () => {
    expect(formatPurchaseDocumentCurrency(12_500, '+')).toBe('+12.500');
  });

  it('keeps payment status labels and classes aligned with purchase documents', () => {
    expect(getPurchaseDocumentPaymentStatusLabel('paid')).toBe('Lunas');
    expect(getPurchaseDocumentPaymentStatusLabel('partial')).toBe('Sebagian');
    expect(getPurchaseDocumentPaymentStatusLabel('unpaid')).toBe(
      'Belum Dibayar'
    );

    expect(getPurchaseDocumentPaymentStatusClass('paid')).toBe(
      'text-green-600'
    );
    expect(getPurchaseDocumentPaymentStatusClass('partial')).toBe(
      'text-orange-600'
    );
    expect(getPurchaseDocumentPaymentStatusClass('unpaid')).toBe(
      'text-red-600'
    );
  });

  it('keeps payment method labels aligned with purchase documents', () => {
    expect(getPurchaseDocumentPaymentMethodLabel('cash')).toBe('Tunai');
    expect(getPurchaseDocumentPaymentMethodLabel('transfer')).toBe('Transfer');
    expect(getPurchaseDocumentPaymentMethodLabel('credit')).toBe('Kredit');
    expect(getPurchaseDocumentPaymentMethodLabel('giro')).toBe('giro');
  });

  it('keeps purchase item display fallbacks aligned with document tables', () => {
    expect(getPurchaseDocumentItemCode(makeItem())).toBe('PRC');
    expect(getPurchaseDocumentItemCode({ item: null })).toBe('-');
    expect(getPurchaseDocumentItemName(makeItem())).toBe('Paracetamol');
    expect(getPurchaseDocumentItemName({ item: null })).toBe(
      'Item tidak ditemukan'
    );
    expect(getPurchaseDocumentPositivePercentageLabel(11)).toBe('11%');
    expect(getPurchaseDocumentPositivePercentageLabel(0)).toBe('-');
  });

  it('parses purchase print session payloads without throwing on corrupt storage', () => {
    expect(parsePurchasePrintSessionValue(null)).toEqual({
      purchase: null,
      items: [],
      subtotals: null,
    });
    expect(parsePurchasePrintSessionValue('{invalid')).toEqual({
      purchase: null,
      items: [],
      subtotals: null,
    });
  });

  it('normalizes printable purchase session data and drops invalid line items', () => {
    expect(
      parsePurchasePrintSessionValue(
        JSON.stringify({
          purchase: makeFullPurchase({
            total: '19980' as unknown as number,
            supplier: {
              name: 'Supplier A',
              address: null,
              contact_person: null,
            },
          }),
          items: [
            makeItem({
              price: '10000' as unknown as number,
              unit_conversion_rate: '1' as unknown as number,
            }),
            {
              id: 'missing-required-fields',
            },
          ],
          subtotals: {
            baseTotal: '20000',
            discountTotal: 2000,
            afterDiscountTotal: 18000,
            vatTotal: 1980,
            grandTotal: 19980,
          },
        })
      )
    ).toEqual({
      purchase: makeFullPurchase({
        total: 19_980,
        supplier: {
          name: 'Supplier A',
          address: null,
          contact_person: null,
        },
      }),
      items: [
        makeItem({
          price: 10_000,
          unit_conversion_rate: 1,
        }),
      ],
      subtotals: {
        baseTotal: 20_000,
        discountTotal: 2_000,
        afterDiscountTotal: 18_000,
        vatTotal: 1_980,
        grandTotal: 19_980,
      },
    });
  });

  it('recalculates printable subtotals when stored session data is from an older shape', () => {
    expect(
      parsePurchasePrintSessionValue(
        JSON.stringify({
          purchase: makeFullPurchase(),
          items: [makeItem()],
        })
      ).subtotals
    ).toEqual({
      baseTotal: 20_000,
      discountTotal: 2_000,
      afterDiscountTotal: 18_000,
      vatTotal: 1_980,
      grandTotal: 19_980,
    });
  });
});
