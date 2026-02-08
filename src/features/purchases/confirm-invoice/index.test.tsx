import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConfirmInvoicePage from './index';

const navigateMock = vi.hoisted(() => vi.fn());
const saveInvoiceToDatabaseMock = vi.hoisted(() => vi.fn());
const regenerateInvoiceDataMock = vi.hoisted(() => vi.fn());

const routerState = vi.hoisted(() => ({
  location: { state: undefined as unknown },
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => routerState.location,
  };
});

vi.mock('@/services/invoiceExtractor', () => ({
  saveInvoiceToDatabase: saveInvoiceToDatabaseMock,
  regenerateInvoiceData: regenerateInvoiceDataMock,
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    isLoading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
  }) => (
    <button {...props}>
      {isLoading ? 'loading...' : null}
      {children}
    </button>
  ),
}));

vi.mock('@/components/loading', () => ({
  default: ({ message }: { message?: string }) => (
    <div>{message ?? 'loading'}</div>
  ),
}));

vi.mock('@/components/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableHead: ({ children }: { children: ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children: ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHeader: ({ children }: { children: ReactNode }) => <th>{children}</th>,
}));

const buildExtractedData = () => ({
  company_details: {
    name: 'PT Pharma',
    address: 'Jl. Sehat No. 1',
  },
  invoice_information: {
    invoice_number: 'INV-001',
    invoice_date: '2026-01-10',
    due_date: '2026-01-20',
  },
  customer_information: {
    customer_name: 'Apotek Maju',
    customer_address: 'Jl. Jaya 2',
  },
  product_list: [
    {
      sku: 'SKU-1',
      product_name: 'Paracetamol',
      quantity: 2,
      unit: 'Strip',
      batch_number: 'B-001',
      expiry_date: '2027-01-01',
      unit_price: 10000,
      discount: 5,
      total_price: 19000,
    },
    {
      sku: null,
      product_name: 'Ibuprofen',
      quantity: 1,
      unit: 'Box',
      batch_number: null,
      expiry_date: null,
      unit_price: '15000',
      discount: 0,
      total_price: 15000,
    },
  ],
  additional_information: {
    checked_by: 'Budi',
  },
  payment_summary: {
    total_price: 34000,
    vat: 3740,
    invoice_total: 37740,
  },
});

describe('ConfirmInvoicePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    saveInvoiceToDatabaseMock.mockReset();
    regenerateInvoiceDataMock.mockReset();

    routerState.location = { state: undefined as unknown };

    saveInvoiceToDatabaseMock.mockResolvedValue(undefined);
    regenerateInvoiceDataMock.mockResolvedValue(buildExtractedData());

    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('redirects to purchases when extracted data is missing', () => {
    render(<ConfirmInvoicePage />);

    expect(navigateMock).toHaveBeenCalledWith('/purchases');
    expect(screen.getByText('Memuat data konfirmasi...')).toBeInTheDocument();
  });

  it('renders extracted data and supports successful regenerate', async () => {
    const initialData = buildExtractedData();
    const regeneratedData = {
      ...buildExtractedData(),
      invoice_information: {
        ...buildExtractedData().invoice_information,
        invoice_number: 'INV-UPDATED',
      },
    };

    routerState.location = {
      state: {
        extractedData: initialData,
        processingTime: '1.2',
        imageIdentifier: 'img-123',
      },
    } as unknown;

    regenerateInvoiceDataMock.mockResolvedValueOnce(regeneratedData);
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3200);

    render(<ConfirmInvoicePage />);

    expect(screen.getByText('Konfirmasi Data Faktur')).toBeInTheDocument();
    expect(screen.getByText('PT Pharma')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(
      screen.getByText(/Data selesai diekstraksi dalam 1.2s/)
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Generate Ulang/i }));

    await waitFor(() => {
      expect(regenerateInvoiceDataMock).toHaveBeenCalledWith('img-123');
      expect(screen.getByText('INV-UPDATED')).toBeInTheDocument();
      expect(
        screen.getByText(/Data selesai diekstraksi dalam/i)
      ).toBeInTheDocument();
    });
  });

  it('handles regenerate error and disables regenerate button when identifier is missing', async () => {
    routerState.location = {
      state: {
        extractedData: buildExtractedData(),
      },
    } as unknown;

    const { unmount } = render(<ConfirmInvoicePage />);

    const regenerateButton = screen.getByRole('button', {
      name: /Generate Ulang/i,
    });
    expect(regenerateButton).toBeDisabled();
    unmount();

    routerState.location = {
      state: {
        extractedData: buildExtractedData(),
        imageIdentifier: 'img-fail',
      },
    } as unknown;

    regenerateInvoiceDataMock.mockRejectedValueOnce(new Error('OCR timeout'));

    render(<ConfirmInvoicePage />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Ulang/i }));

    expect(await screen.findByText('OCR timeout')).toBeInTheDocument();
  });

  it('confirms invoice successfully and navigates back', async () => {
    routerState.location = {
      state: {
        extractedData: buildExtractedData(),
        imageIdentifier: 'img-999',
      },
    } as unknown;

    render(<ConfirmInvoicePage />);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: /Konfirmasi & Simpan/i })
    );

    await waitFor(() => {
      expect(saveInvoiceToDatabaseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_information: expect.objectContaining({
            invoice_number: 'INV-001',
          }),
        }),
        'img-999'
      );
      expect(window.alert).toHaveBeenCalledWith('Faktur berhasil disimpan!');
      expect(navigateMock).toHaveBeenCalledWith('/purchases');
    });
  });

  it('shows error when confirm save fails', async () => {
    routerState.location = {
      state: {
        extractedData: buildExtractedData(),
        imageIdentifier: 'img-500',
      },
    } as unknown;

    saveInvoiceToDatabaseMock.mockRejectedValueOnce(new Error('DB offline'));

    render(<ConfirmInvoicePage />);

    fireEvent.click(
      screen.getByRole('button', { name: /Konfirmasi & Simpan/i })
    );

    expect(await screen.findByText('DB offline')).toBeInTheDocument();
  });
});
