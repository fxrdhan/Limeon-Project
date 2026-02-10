import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ViewPurchase from './index';

const navigateMock = vi.hoisted(() => vi.fn());
const getPurchaseWithDetailsMock = vi.hoisted(() => vi.fn());
const getPurchaseItemsMock = vi.hoisted(() => vi.fn());

const routeState = vi.hoisted(() => ({
  params: { id: 'purchase-1' } as { id?: string },
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => routeState.params,
  };
});

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: {
    getPurchaseWithDetails: getPurchaseWithDetailsMock,
    getPurchaseItems: getPurchaseItemsMock,
  },
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/loading', () => ({
  default: ({ message }: { message?: string }) => <div>{message}</div>,
}));

vi.mock('@/components/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const buildPurchase = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'purchase-1',
    invoice_number: 'INV-2026-001',
    date: '2026-01-10',
    due_date: '2026-01-20',
    total: 50000,
    payment_status: 'partial',
    payment_method: 'transfer',
    vat_percentage: 11,
    is_vat_included: false,
    vat_amount: 4950,
    notes: null,
    supplier: {
      name: 'PT Supplier Sejahtera',
      address: 'Jl. Mawar 1',
      contact_person: 'Dian',
    },
    customer_name: 'Apotek Maju',
    customer_address: null,
    checked_by: 'Andi',
    ...overrides,
  }) as never;

const buildItems = () =>
  [
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
    {
      id: 'item-2',
      item_id: 'itm-2',
      item_name: 'Ibuprofen',
      quantity: 1,
      price: 20000,
      discount: 0,
      subtotal: 20000,
      unit: 'Box',
      vat_percentage: 11,
      batch_no: null,
      expiry_date: null,
      unit_conversion_rate: 1,
      item: {
        code: 'IBU-002',
        name: 'Ibuprofen',
      },
    },
  ] as never;

describe('ViewPurchase', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getPurchaseWithDetailsMock.mockReset();
    getPurchaseItemsMock.mockReset();

    routeState.params = { id: 'purchase-1' };

    getPurchaseWithDetailsMock.mockResolvedValue({
      data: buildPurchase(),
      error: null,
    });
    getPurchaseItemsMock.mockResolvedValue({
      data: buildItems(),
      error: null,
    });

    sessionStorage.clear();
  });

  it('shows loading then fallback when purchase data is missing', async () => {
    getPurchaseWithDetailsMock.mockResolvedValueOnce({
      data: null,
      error: new Error('not found'),
    });

    render(<ViewPurchase />);

    expect(screen.getByText('Memuat data pembelian...')).toBeInTheDocument();

    expect(
      await screen.findByText('Data pembelian tidak ditemukan')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Kembali ke Daftar Pembelian/i })
    );

    expect(navigateMock).toHaveBeenCalledWith('/purchases');
  });

  it('renders purchase details, computes totals, and opens print view', async () => {
    const focusMock = vi.fn();
    const openMock = vi
      .spyOn(window, 'open')
      .mockReturnValue({ focus: focusMock } as never);

    render(<ViewPurchase />);

    expect(await screen.findByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    expect(screen.getByText('Sebagian')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText(/belum tersedia/i)).toBeInTheDocument();

    expect(screen.getByText('40.000')).toBeInTheDocument();
    expect(screen.getByText('-1.000')).toBeInTheDocument();
    expect(screen.getByText('39.000')).toBeInTheDocument();
    expect(screen.getByText('+4.290')).toBeInTheDocument();
    expect(screen.getByText('43.290')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Print View/i }));

    const saved = JSON.parse(sessionStorage.getItem('purchaseData') || '{}');
    expect(saved.purchase.invoice_number).toBe('INV-2026-001');
    expect(saved.items).toHaveLength(2);
    expect(saved.subtotals.grandTotal).toBe(43290);

    expect(openMock).toHaveBeenCalledWith('/purchases/print-view', '_blank');
    expect(focusMock).toHaveBeenCalledTimes(1);
  });

  it('supports VAT-included mode and zoom controls with boundaries', async () => {
    getPurchaseWithDetailsMock.mockResolvedValueOnce({
      data: buildPurchase({
        is_vat_included: true,
        payment_status: 'paid',
        payment_method: 'cash',
      }),
      error: null,
    });

    render(<ViewPurchase />);

    expect(await screen.findByText('Lunas')).toBeInTheDocument();
    expect(screen.getByText('Tunai')).toBeInTheDocument();
    expect(
      screen.getByText('* PPN sudah termasuk dalam harga')
    ).toBeInTheDocument();

    const zoomIn = screen.getByRole('button', { name: 'Perbesar' });
    const zoomOut = screen.getByRole('button', { name: 'Perkecil' });

    for (let index = 0; index < 8; index += 1) {
      fireEvent.click(zoomIn);
    }
    expect(screen.getByText('150%')).toBeInTheDocument();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(zoomOut);
    }
    expect(screen.getByText('50%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Kembali/i }));
    expect(navigateMock).toHaveBeenCalledWith('/purchases');
  });

  it('skips fetch when route has no id', () => {
    routeState.params = {};

    render(<ViewPurchase />);

    expect(getPurchaseWithDetailsMock).not.toHaveBeenCalled();
    expect(getPurchaseItemsMock).not.toHaveBeenCalled();
  });

  it('handles item retrieval error and lands on not-found state', async () => {
    getPurchaseItemsMock.mockResolvedValueOnce({
      data: null,
      error: new Error('items failed'),
    });

    render(<ViewPurchase />);

    await waitFor(() => {
      expect(
        screen.getByText('Data pembelian tidak ditemukan')
      ).toBeInTheDocument();
    });
  });

  it('handles unknown payment labels and print window blocked state', async () => {
    getPurchaseWithDetailsMock.mockResolvedValueOnce({
      data: buildPurchase({
        payment_status: 'custom-status',
        payment_method: 'custom-method',
      }),
      error: null,
    });

    vi.spyOn(window, 'open').mockReturnValueOnce(null);

    render(<ViewPurchase />);

    expect(await screen.findByText('Belum Dibayar')).toBeInTheDocument();
    expect(screen.getByText('custom-method')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Print View/i }));

    const saved = JSON.parse(sessionStorage.getItem('purchaseData') || '{}');
    expect(saved.purchase.invoice_number).toBe('INV-2026-001');
  });
});
