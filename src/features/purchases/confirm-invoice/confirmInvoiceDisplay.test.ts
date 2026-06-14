import { describe, expect, it } from 'vite-plus/test';
import {
  buildConfirmInvoiceProductRows,
  formatConfirmInvoiceCurrency,
  formatConfirmInvoiceProductField,
} from './confirmInvoiceDisplay';

describe('confirm invoice display helpers', () => {
  it('formats currency values with the existing Indonesian number format', () => {
    expect(formatConfirmInvoiceCurrency(12_500)).toBe('12.500');
    expect(formatConfirmInvoiceCurrency('12500', 'Rp ')).toBe('Rp 12.500');
    expect(formatConfirmInvoiceCurrency(null)).toBe('-');
    expect(formatConfirmInvoiceCurrency('not-a-number')).toBe('-');
  });

  it('formats product fields and discount fields like the confirmation grid', () => {
    expect(formatConfirmInvoiceProductField('BOX')).toBe('BOX');
    expect(formatConfirmInvoiceProductField(1_250)).toBe('1,250');
    expect(formatConfirmInvoiceProductField(10, true)).toBe('10%');
    expect(formatConfirmInvoiceProductField(null, true)).toBe('-');
  });

  it('creates stable grid row ids from SKU, product name, or fallback text', () => {
    expect(
      buildConfirmInvoiceProductRows([
        { sku: 'SKU-1', product_name: 'A' },
        { product_name: 'B' },
        {},
      ]).map(product => product.gridId)
    ).toEqual(['product-SKU-1-0', 'product-B-1', 'product-unknown-2']);
  });
});
