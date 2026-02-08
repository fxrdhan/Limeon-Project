import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrintPurchase from './index';

const buildPayload = (overrides: Record<string, unknown> = {}) => ({
  purchase: {
    id: 'purchase-1',
    invoice_number: 'INV-PRN-001',
    date: '2026-01-10',
    due_date: '2026-01-20',
    total: 43290,
    payment_status: 'partial',
    payment_method: 'transfer',
    vat_percentage: 11,
    is_vat_included: false,
    vat_amount: 4290,
    notes: null,
    supplier: {
      name: 'PT Supplier Sejahtera',
      address: 'Jl. Mawar 1',
      contact_person: 'Dian',
    },
    customer_name: 'Apotek Maju',
    customer_address: null,
    checked_by: 'Budi',
    ...overrides,
  },
  items: [
    {
      id: 'item-1',
      item_id: 'itm-1',
      item_name: 'Paracetamol',
      quantity: 2,
      price: 10000,
      discount: 5,
      subtotal: 19000,
      unit: 'Strip',
      vat_percentage: 11,
      batch_no: 'B-001',
      expiry_date: '2027-01-01',
      unit_conversion_rate: 1,
      item: {
        code: 'PCM-001',
        name: 'Paracetamol',
      },
    },
  ],
  subtotals: {
    baseTotal: 20000,
    discountTotal: 1000,
    afterDiscountTotal: 19000,
    vatTotal: 2090,
    grandTotal: 21090,
  },
});

describe('PrintPurchase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows not-found state when purchase data is missing', () => {
    render(<PrintPurchase />);

    expect(
      screen.getByText(
        'Data faktur tidak ditemukan. Silakan kembali ke halaman sebelumnya.'
      )
    ).toBeInTheDocument();

    vi.advanceTimersByTime(1000);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('renders printable purchase content with VAT excluded', () => {
    sessionStorage.setItem('purchaseData', JSON.stringify(buildPayload()));

    render(<PrintPurchase />);

    expect(screen.getByText('FAKTUR PEMBELIAN')).toBeInTheDocument();
    expect(screen.getByText('INV-PRN-001')).toBeInTheDocument();
    expect(screen.getByText('PT Supplier Sejahtera')).toBeInTheDocument();
    expect(screen.getByText('Alamat belum tersedia')).toBeInTheDocument();
    expect(screen.getByText('Sebagian')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getAllByText('PPN')).toHaveLength(2);
    expect(screen.getByText('+2.090')).toBeInTheDocument();
    expect(screen.getByText('21.090')).toBeInTheDocument();

    vi.advanceTimersByTime(1000);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('handles VAT included mode, empty items, and cleanup timer on unmount', () => {
    sessionStorage.setItem(
      'purchaseData',
      JSON.stringify(
        buildPayload({
          payment_status: 'paid',
          payment_method: 'cash',
          is_vat_included: true,
          notes: 'Lunas',
        })
      )
    );

    sessionStorage.setItem(
      'purchaseData',
      JSON.stringify({
        ...buildPayload({
          payment_status: 'paid',
          payment_method: 'cash',
          is_vat_included: true,
          notes: 'Lunas',
        }),
        items: [],
        subtotals: {
          baseTotal: 0,
          discountTotal: 0,
          afterDiscountTotal: 0,
          vatTotal: 0,
          grandTotal: 0,
        },
      })
    );

    const { unmount } = render(<PrintPurchase />);

    expect(screen.getAllByText('Lunas')).toHaveLength(2);
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada item')).toBeInTheDocument();
    expect(
      screen.getByText('* PPN sudah termasuk dalam harga')
    ).toBeInTheDocument();

    unmount();
    vi.advanceTimersByTime(1000);

    expect(window.print).not.toHaveBeenCalled();
  });
});
