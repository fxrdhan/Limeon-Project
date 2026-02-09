import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InvoiceLayout from './index';

const baseSubtotals = {
  baseTotal: 100000,
  discountTotal: 5000,
  afterDiscountTotal: 95000,
  vatTotal: 10450,
  grandTotal: 105450,
};

describe('InvoiceLayout', () => {
  it('renders fallback values, empty items state, and non-VAT columns', () => {
    render(
      <InvoiceLayout
        purchase={{
          id: 'p-1',
          invoice_number: 'INV-1',
          date: '2025-01-01',
          due_date: null,
          total: 0,
          payment_status: 'unpaid',
          payment_method: 'other-method',
          vat_percentage: 11,
          is_vat_included: false,
          vat_amount: 0,
          notes: null,
          supplier: {
            name: '',
            address: null,
            contact_person: null,
          },
          customer_name: '',
          customer_address: '',
          checked_by: '',
        }}
        items={[]}
        subtotals={baseSubtotals}
        printRef={createRef<HTMLDivElement>()}
      />
    );

    expect(screen.getByText('Supplier')).toBeInTheDocument();
    expect(screen.getByText('Data belum tersedia')).toBeInTheDocument();
    expect(screen.getByText('Alamat belum tersedia')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada item')).toBeInTheDocument();
    expect(screen.getAllByText('PPN').length).toBeGreaterThan(0);
    expect(screen.getByText('Belum Dibayar')).toBeInTheDocument();
    expect(screen.getByText('other-method')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders item rows and VAT-included message without PPN columns', () => {
    render(
      <InvoiceLayout
        purchase={{
          id: 'p-2',
          invoice_number: 'INV-2',
          date: '2025-02-01',
          due_date: '2025-02-10',
          total: 110000,
          payment_status: 'partial',
          payment_method: 'transfer',
          vat_percentage: 11,
          is_vat_included: true,
          vat_amount: 10000,
          notes: 'Catatan pembelian',
          supplier: {
            name: 'PT Supplier',
            address: 'Jl. Supplier',
            contact_person: 'Andi',
          },
          customer_name: 'Apotek Maju',
          customer_address: 'Jl. Pelanggan',
          checked_by: 'Checker',
        }}
        items={[
          {
            id: 'i-1',
            item_id: 'it-1',
            item_name: 'Paracetamol',
            item: {
              code: 'PARA-01',
              name: 'Paracetamol',
            },
            quantity: 2,
            price: 50000,
            discount: 10,
            subtotal: 90000,
            unit: 'Strip',
            vat_percentage: 11,
            batch_no: 'B-1',
            expiry_date: '2026-01-01',
            unit_conversion_rate: 1,
          },
        ]}
        subtotals={baseSubtotals}
      />
    );

    expect(screen.getByText('PT Supplier')).toBeInTheDocument();
    expect(screen.getByText('Apotek Maju')).toBeInTheDocument();
    expect(screen.getByText('Sebagian')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('PARA-01')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(
      screen.getByText('* PPN sudah termasuk dalam harga')
    ).toBeInTheDocument();
    expect(screen.queryByText('PPN')).not.toBeInTheDocument();
  });

  it('handles paid/cash and credit payment method labels', () => {
    const { rerender } = render(
      <InvoiceLayout
        purchase={{
          id: 'p-3',
          invoice_number: 'INV-3',
          date: '2025-03-01',
          due_date: '2025-03-05',
          total: 50000,
          payment_status: 'paid',
          payment_method: 'cash',
          vat_percentage: 11,
          is_vat_included: false,
          vat_amount: 0,
          notes: 'OK',
          supplier: {
            name: 'Cash Supplier',
            address: null,
            contact_person: null,
          },
          checked_by: 'Petugas',
        }}
        items={[
          {
            id: 'i-2',
            item_id: 'it-2',
            item_name: 'Item Tanpa Data',
            item: {
              code: '',
              name: '',
            },
            quantity: 1,
            price: 50000,
            discount: 0,
            subtotal: 50000,
            unit: 'Pcs',
            vat_percentage: 0,
            batch_no: null,
            expiry_date: null,
            unit_conversion_rate: 1,
          },
        ]}
        subtotals={baseSubtotals}
      />
    );

    expect(screen.getByText('Lunas')).toBeInTheDocument();
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(screen.getByText('Item tidak ditemukan')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    rerender(
      <InvoiceLayout
        purchase={{
          id: 'p-4',
          invoice_number: 'INV-4',
          date: '2025-04-01',
          due_date: null,
          total: 50000,
          payment_status: 'partial',
          payment_method: 'credit',
          vat_percentage: 11,
          is_vat_included: false,
          vat_amount: 0,
          notes: null,
          supplier: {
            name: 'Credit Supplier',
            address: null,
            contact_person: null,
          },
        }}
        items={[]}
        subtotals={baseSubtotals}
      />
    );

    expect(screen.getByText('Kredit')).toBeInTheDocument();
  });
});
