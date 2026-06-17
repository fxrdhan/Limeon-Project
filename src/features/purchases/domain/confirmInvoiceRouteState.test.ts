import { describe, expect, it } from 'vite-plus/test';
import {
  normalizeConfirmInvoiceRouteState,
  normalizeExtractedInvoiceData,
} from './confirmInvoiceRouteState';

describe('confirm invoice route state normalization', () => {
  it('normalizes a valid route state without mutating the source payload', () => {
    const extractedData = {
      company_details: { name: 'Supplier A', address: 'Jl. Sudirman' },
      invoice_information: {
        invoice_number: 'INV-1',
        invoice_date: '2026-06-16',
        due_date: '2026-06-30',
      },
      customer_information: {
        customer_name: 'PharmaSys',
        customer_address: 'Jakarta',
      },
      product_list: [
        {
          sku: 'SKU-1',
          product_name: 'Obat A',
          quantity: '10',
          unit: 'box',
          unit_price: '12500',
          discount: '5',
          total_price: '118750',
        },
      ],
      payment_summary: {
        total_price: '125000',
        vat: '13750',
        invoice_total: '138750',
      },
      additional_information: { checked_by: 'Admin' },
      imageIdentifier: 'image-from-data',
    };

    const result = normalizeConfirmInvoiceRouteState({
      extractedData,
      imageIdentifier: 'image-from-route',
      processingTime: '1.3',
    });

    expect(result).toEqual({
      invoiceData: {
        company_details: {
          name: 'Supplier A',
          address: 'Jl. Sudirman',
          license_dak: undefined,
          certificate_cdob: undefined,
        },
        invoice_information: {
          invoice_number: 'INV-1',
          invoice_date: '2026-06-16',
          due_date: '2026-06-30',
        },
        customer_information: {
          customer_name: 'PharmaSys',
          customer_address: 'Jakarta',
        },
        product_list: [
          {
            sku: 'SKU-1',
            product_name: 'Obat A',
            quantity: 10,
            unit: 'box',
            batch_number: undefined,
            expiry_date: undefined,
            unit_price: 12500,
            discount: 5,
            total_price: 118750,
          },
        ],
        payment_summary: {
          total_price: 125000,
          vat: 13750,
          invoice_total: 138750,
        },
        additional_information: { checked_by: 'Admin' },
        rawText: undefined,
        imageIdentifier: 'image-from-data',
      },
      imageIdentifier: 'image-from-route',
      processingTime: '1.3',
    });
    expect(extractedData.product_list[0].quantity).toBe('10');
  });

  it('uses the extracted image identifier when route metadata is missing', () => {
    expect(
      normalizeConfirmInvoiceRouteState({
        extractedData: { imageIdentifier: 'image-from-data' },
      })?.imageIdentifier
    ).toBe('image-from-data');
  });

  it('rejects non-object route state and extracted invoice data', () => {
    expect(normalizeConfirmInvoiceRouteState(null)).toBeNull();
    expect(
      normalizeConfirmInvoiceRouteState({ extractedData: 'bad' })
    ).toBeNull();
    expect(normalizeExtractedInvoiceData('bad')).toBeNull();
  });

  it('drops malformed product rows without rejecting the whole invoice', () => {
    expect(
      normalizeExtractedInvoiceData({
        product_list: [
          null,
          { sku: 12345, product_name: ' Valid row ', quantity: '2' },
          'bad-row',
        ],
      })?.product_list
    ).toEqual([
      {
        sku: '12345',
        product_name: 'Valid row',
        quantity: 2,
        unit: undefined,
        batch_number: undefined,
        expiry_date: undefined,
        unit_price: undefined,
        discount: undefined,
        total_price: undefined,
      },
    ]);
  });

  it('does not coerce blank numeric fields to zero', () => {
    expect(
      normalizeExtractedInvoiceData({
        invoice_information: { invoice_number: 1001 },
        product_list: [{ quantity: '', unit_price: '   ', total_price: 0 }],
      })
    ).toMatchObject({
      invoice_information: { invoice_number: '1001' },
      product_list: [
        {
          quantity: undefined,
          unit_price: undefined,
          total_price: 0,
        },
      ],
    });
  });
});
