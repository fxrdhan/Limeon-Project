import { describe, expect, it } from 'vite-plus/test';
import type { Supplier } from '../../../../types';
import {
  buildSupplierCreatePayload,
  buildSupplierModalData,
  buildSupplierUpdatePayload,
  normalizeSupplierInlineFieldValue,
} from './supplierModalData';

const supplier: Supplier = {
  id: 'supplier-1',
  name: 'PT Sehat',
  address: 'Jl. Merdeka',
  phone: '021',
  email: 'supplier@example.com',
  contact_person: 'Budi',
  image_url: 'https://example.com/supplier.png',
  updated_at: '2026-06-15T00:00:00.000Z',
};

describe('supplier modal data helpers', () => {
  it('keeps inline text field normalization behavior', () => {
    expect(normalizeSupplierInlineFieldValue('name', '  PT Baru  ')).toBe(
      'PT Baru'
    );
    expect(normalizeSupplierInlineFieldValue('phone', '')).toBeNull();
    expect(normalizeSupplierInlineFieldValue('email', null)).toBeNull();
    expect(
      normalizeSupplierInlineFieldValue(
        'contact_person',
        new Date('2026-06-15T00:00:00.000Z')
      )
    ).toBe('2026-06-15T00:00:00.000Z');
    expect(normalizeSupplierInlineFieldValue('custom', { keep: true })).toEqual(
      { keep: true }
    );
  });

  it('builds modal data from primitive supplier fields only', () => {
    expect(
      buildSupplierModalData({
        ...supplier,
        address: null,
      })
    ).toEqual({
      id: 'supplier-1',
      name: 'PT Sehat',
      address: null,
      phone: '021',
      email: 'supplier@example.com',
      contact_person: 'Budi',
      image_url: 'https://example.com/supplier.png',
      updated_at: '2026-06-15T00:00:00.000Z',
    });
    expect(buildSupplierModalData(null)).toEqual({});
  });

  it('builds create payloads with existing modal save semantics', () => {
    expect(
      buildSupplierCreatePayload({
        name: 0,
        address: '  ',
        phone: '021',
        email: '',
        contact_person: false,
        image_url: 'https://example.com/supplier.png',
      })
    ).toEqual({
      name: '',
      address: '  ',
      phone: '021',
      email: null,
      contact_person: null,
      image_url: 'https://example.com/supplier.png',
    });
  });

  it('builds update payloads without image fields', () => {
    expect(
      buildSupplierUpdatePayload({
        name: 'PT Update',
        address: undefined,
        phone: '0812',
        email: 'updated@example.com',
        contact_person: '',
        image_url: 'ignored',
      })
    ).toEqual({
      name: 'PT Update',
      address: null,
      phone: '0812',
      email: 'updated@example.com',
      contact_person: null,
    });
  });
});
