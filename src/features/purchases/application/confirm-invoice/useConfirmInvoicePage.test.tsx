import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ExtractedInvoiceData } from '../../../../types';
import { useConfirmInvoicePage } from './useConfirmInvoicePage';

const {
  locationMock,
  navigateMock,
  regenerateConfirmedInvoiceDataMock,
  saveConfirmedInvoiceToDatabaseMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  locationMock: { state: null as unknown },
  navigateMock: vi.fn(),
  regenerateConfirmedInvoiceDataMock: vi.fn(),
  saveConfirmedInvoiceToDatabaseMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useLocation: () => locationMock,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../infrastructure/confirmInvoiceData', () => ({
  regenerateConfirmedInvoiceData: regenerateConfirmedInvoiceDataMock,
  saveConfirmedInvoiceToDatabase: saveConfirmedInvoiceToDatabaseMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
  },
}));

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const createInvoiceData = (invoiceNumber: string): ExtractedInvoiceData => ({
  company_details: { name: 'Supplier A' },
  invoice_information: {
    invoice_number: invoiceNumber,
    invoice_date: '2026-06-16',
  },
  product_list: [],
  payment_summary: {
    invoice_total: 125_000,
  },
});

const createRouteState = (invoiceNumber: string, imageIdentifier: string) => ({
  extractedData: createInvoiceData(invoiceNumber),
  imageIdentifier,
  processingTime: '1.1',
});

describe('useConfirmInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.state = createRouteState('INV-001', 'image-1');
  });

  it('ignores stale regenerate results after the route state changes', async () => {
    const regenerate = createDeferred<ExtractedInvoiceData>();
    regenerateConfirmedInvoiceDataMock.mockReturnValueOnce(regenerate.promise);

    const { result, rerender } = renderHook(() => useConfirmInvoicePage());

    await waitFor(() => {
      expect(result.current.imageIdentifier).toBe('image-1');
    });

    let regeneratePromise: Promise<void> = Promise.resolve();
    act(() => {
      regeneratePromise = result.current.handleRegenerate();
    });

    locationMock.state = createRouteState('INV-002', 'image-2');
    rerender();

    await waitFor(() => {
      expect(result.current.imageIdentifier).toBe('image-2');
    });

    await act(async () => {
      regenerate.resolve(createInvoiceData('STALE-INV'));
      await regeneratePromise;
      await Promise.resolve();
    });

    expect(
      result.current.invoiceData?.invoice_information?.invoice_number
    ).toBe('INV-002');
    expect(result.current.isRegenerating).toBe(false);
  });

  it('ignores duplicate confirm calls while save is in flight', async () => {
    const save = createDeferred<void>();
    saveConfirmedInvoiceToDatabaseMock.mockReturnValue(save.promise);

    const { result } = renderHook(() => useConfirmInvoicePage());

    await waitFor(() => {
      expect(result.current.invoiceData).not.toBeNull();
    });

    let firstConfirmPromise: Promise<void> = Promise.resolve();
    let secondConfirmPromise: Promise<void> = Promise.resolve();
    act(() => {
      firstConfirmPromise = result.current.handleConfirm();
      secondConfirmPromise = result.current.handleConfirm();
    });

    expect(saveConfirmedInvoiceToDatabaseMock).toHaveBeenCalledOnce();

    await act(async () => {
      save.resolve();
      await firstConfirmPromise;
      await secondConfirmPromise;
      await Promise.resolve();
    });

    expect(toastSuccessMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith('/purchases');
  });
});
