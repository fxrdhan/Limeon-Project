import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchaseListPage from './PurchaseListPage';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const getPaginatedPurchasesMock = vi.hoisted(() => vi.fn());
const deletePurchaseWithStockRestoreMock = vi.hoisted(() => vi.fn());
const openConfirmDialogMock = vi.hoisted(() => vi.fn());
const useFieldFocusMock = vi.hoisted(() => vi.fn());
const getSearchStateMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const locationMock = vi.hoisted(() => ({
  key: 'purchase-list-loc',
}));

const captured = vi.hoisted(() => ({
  uploadPortalProps: null as null | { isOpen: boolean; onClose: () => void },
  addPortalProps: null as null | {
    isOpen: boolean;
    isClosing: boolean;
    onClose: () => void;
    setIsClosing: (v: boolean) => void;
    initialInvoiceNumber?: string;
  },
  latestQueryConfig: null as null | {
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
  },
  latestMutationConfig: null as null | {
    mutationFn: (id: string) => Promise<unknown>;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
}));

const queryState = vi.hoisted(() => ({
  data: {
    purchases: [] as Array<{
      id: string;
      invoice_number: string;
      date: string;
      total: number;
      payment_status: string;
      payment_method: string;
      supplier: { name: string } | null;
    }>,
    totalItems: 0,
  },
  isLoading: false,
  isFetching: false,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
    useLocation: () => locationMock,
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
  keepPreviousData: Symbol('keep-previous-data'),
}));

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: {
    getPaginatedPurchases: getPaginatedPurchasesMock,
    deletePurchaseWithStockRestore: deletePurchaseWithStockRestoreMock,
  },
}));

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: openConfirmDialogMock,
  }),
}));

vi.mock('@/hooks/forms/fieldFocus', () => ({
  useFieldFocus: useFieldFocusMock,
}));

vi.mock('@/utils/search', () => ({
  getSearchState: getSearchStateMock,
}));

vi.mock('@/components/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" data-class={className ?? ''}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/search-bar', () => ({
  SearchBar: ({
    inputRef,
    value,
    onChange,
    placeholder,
    searchState,
  }: {
    inputRef?: React.Ref<HTMLInputElement>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    searchState: string;
  }) => (
    <div>
      <input
        ref={inputRef}
        aria-label="purchase-search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <span data-testid="search-state">{searchState}</span>
    </div>
  ),
}));

vi.mock('@/components/badge', () => ({
  default: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock('@/components/pagination', () => ({
  default: ({
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <div>
      <span>{`page:${currentPage}/${totalPages}`}</span>
      <span>{`limit:${itemsPerPage}`}</span>
      <button type="button" onClick={() => onPageChange(currentPage + 1)}>
        next-page
      </button>
      <select
        aria-label="items-per-page"
        value={itemsPerPage}
        onChange={onItemsPerPageChange}
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
      </select>
    </div>
  ),
}));

vi.mock(
  '@/features/purchase-management/components/UploadInvoicePortal',
  () => ({
    default: (props: { isOpen: boolean; onClose: () => void }) => {
      captured.uploadPortalProps = props;
      return (
        <div data-testid="upload-portal">{`upload-open:${String(props.isOpen)}`}</div>
      );
    },
  })
);

vi.mock('@/features/purchase-management', () => ({
  AddPurchasePortal: (props: {
    isOpen: boolean;
    isClosing: boolean;
    onClose: () => void;
    setIsClosing: (v: boolean) => void;
    initialInvoiceNumber?: string;
  }) => {
    captured.addPortalProps = props;
    return (
      <div data-testid="add-purchase-portal">
        <span>{`add-open:${String(props.isOpen)}`}</span>
        <span>{`add-closing:${String(props.isClosing)}`}</span>
        <span>{`invoice:${props.initialInvoiceNumber ?? ''}`}</span>
        <button type="button" onClick={props.onClose}>
          close-add-portal
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/table', () => ({
  Table: ({
    children,
    data,
    onSort,
  }: {
    children: React.ReactNode;
    data: unknown[];
    onSort?: (rows: unknown[]) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onSort?.([...(data as unknown[])].reverse())}
      >
        sort-reverse
      </button>
      <table>{children}</table>
    </div>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  PurchaseListSkeleton: ({ rows }: { rows: number }) => (
    <div>{`skeleton-rows:${rows}`}</div>
  ),
}));

const makePurchase = (
  overrides: Partial<(typeof queryState.data.purchases)[number]> = {}
) => ({
  id: 'pur-1',
  invoice_number: 'INV-001',
  date: '2026-01-01',
  total: 15000,
  payment_status: 'unpaid',
  payment_method: 'cash',
  supplier: { name: 'Supplier A' },
  ...overrides,
});

describe('PurchaseListPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    queryState.data = { purchases: [], totalItems: 0 };
    queryState.isLoading = false;
    queryState.isFetching = false;

    captured.uploadPortalProps = null;
    captured.addPortalProps = null;
    captured.latestQueryConfig = null;
    captured.latestMutationConfig = null;

    getPaginatedPurchasesMock.mockReset();
    deletePurchaseWithStockRestoreMock.mockReset();
    openConfirmDialogMock.mockReset();
    useFieldFocusMock.mockReset();
    getSearchStateMock.mockReset();
    invalidateQueriesMock.mockReset();

    getSearchStateMock.mockReturnValue('idle');
    getPaginatedPurchasesMock.mockResolvedValue({
      data: { purchases: [], totalItems: 0 },
      error: null,
    });
    deletePurchaseWithStockRestoreMock.mockResolvedValue({ error: null });

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
      }) => {
        captured.latestQueryConfig = config;
        return {
          data: queryState.data,
          isLoading: queryState.isLoading,
          isFetching: queryState.isFetching,
        };
      }
    );

    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (id: string) => Promise<unknown>;
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      }) => {
        captured.latestMutationConfig = config;

        return {
          isPending: false,
          variables: undefined,
          mutate: async (id: string) => {
            try {
              await config.mutationFn(id);
              config.onSuccess?.();
            } catch (error) {
              config.onError?.(error as Error);
            }
          },
        };
      }
    );
  });

  it('renders loading state and toggles upload/add portals', () => {
    queryState.isLoading = true;
    queryState.data = { purchases: [], totalItems: 0 };

    render(<PurchaseListPage />);

    expect(screen.getByText('skeleton-rows:8')).toBeInTheDocument();
    expect(screen.getByTestId('upload-portal')).toHaveTextContent(
      'upload-open:false'
    );
    expect(screen.getByTestId('add-purchase-portal')).toHaveTextContent(
      'add-open:false'
    );

    fireEvent.click(screen.getByRole('button', { name: /Upload Faktur/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Tambah Pembelian Baru/i })
    );

    expect(screen.getByTestId('upload-portal')).toHaveTextContent(
      'upload-open:true'
    );
    expect(screen.getByTestId('add-purchase-portal')).toHaveTextContent(
      'add-open:true'
    );
  });

  it('handles queryFn, empty-search states, and pagination/search updates', async () => {
    render(<PurchaseListPage />);

    expect(
      screen.getByText('Tidak ada data pembelian yang ditemukan')
    ).toBeInTheDocument();
    expect(captured.latestQueryConfig?.queryKey).toEqual([
      'purchases',
      1,
      '',
      10,
    ]);

    await expect(captured.latestQueryConfig?.queryFn()).resolves.toEqual({
      purchases: [],
      totalItems: 0,
    });

    getPaginatedPurchasesMock.mockResolvedValueOnce({
      data: null,
      error: new Error('fetch-error'),
    });
    await expect(captured.latestQueryConfig?.queryFn()).rejects.toThrow(
      'fetch-error'
    );

    fireEvent.change(screen.getByLabelText('purchase-search'), {
      target: { value: 'INV-ABC' },
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(
      screen.getByText('Tidak ada pembelian dengan kata kunci "INV-ABC"')
    ).toBeInTheDocument();
    expect(captured.latestQueryConfig?.queryKey).toEqual([
      'purchases',
      1,
      'INV-ABC',
      10,
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'next-page' }));
    expect(captured.latestQueryConfig?.queryKey).toEqual([
      'purchases',
      2,
      'INV-ABC',
      10,
    ]);

    fireEvent.change(screen.getByLabelText('items-per-page'), {
      target: { value: '25' },
    });
    expect(captured.latestQueryConfig?.queryKey).toEqual([
      'purchases',
      1,
      'INV-ABC',
      25,
    ]);
  });

  it('renders rows, maps labels, handles sorting and delete mutation flows', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    queryState.data = {
      purchases: [
        makePurchase({
          id: 'pur-1',
          invoice_number: 'INV-001',
          payment_status: 'paid',
          payment_method: 'transfer',
          supplier: { name: 'Supplier A' },
        }),
        makePurchase({
          id: 'pur-2',
          invoice_number: 'INV-002',
          payment_status: 'partial',
          payment_method: 'credit',
          supplier: null,
        }),
        makePurchase({
          id: 'pur-3',
          invoice_number: 'INV-003',
          payment_status: 'unknown-status',
          payment_method: 'unknown-method',
        }),
      ],
      totalItems: 3,
    };

    render(<PurchaseListPage />);

    expect(screen.getByText('Lunas')).toBeInTheDocument();
    expect(screen.getByText('Sebagian')).toBeInTheDocument();
    expect(screen.getByText('unknown-status')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('Kredit')).toBeInTheDocument();
    expect(screen.getByText('unknown-method')).toBeInTheDocument();
    expect(screen.getByText('Tidak ada supplier')).toBeInTheDocument();

    const rowsBeforeSort = screen.getAllByRole('row');
    expect(rowsBeforeSort[1]).toHaveTextContent('INV-001');

    fireEvent.click(screen.getByRole('button', { name: 'sort-reverse' }));
    const rowsAfterSort = screen.getAllByRole('row');
    expect(rowsAfterSort[1]).toHaveTextContent('INV-003');

    const deleteButtons = Array.from(
      document.querySelectorAll('button[variant="danger"]')
    ) as HTMLButtonElement[];
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    expect(openConfirmDialogMock).toHaveBeenCalledTimes(1);
    const confirmConfig = openConfirmDialogMock.mock.calls[0][0] as {
      onConfirm: () => void;
      title: string;
      confirmText: string;
    };
    expect(confirmConfig.title).toBe('Konfirmasi Hapus');
    expect(confirmConfig.confirmText).toBe('Hapus');

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(deletePurchaseWithStockRestoreMock).toHaveBeenCalledWith('pur-3');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['purchases'],
    });

    deletePurchaseWithStockRestoreMock.mockResolvedValueOnce({
      error: new Error('delete-failed'),
    });

    await act(async () => {
      await confirmConfig.onConfirm();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Gagal menghapus pembelian: delete-failed')
    );
    alertSpy.mockRestore();
  });

  it('runs AddPurchasePortal close sequence and refocuses search input', async () => {
    queryState.isFetching = true;
    render(<PurchaseListPage />);

    const input = screen.getByLabelText('purchase-search') as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');

    fireEvent.click(
      screen.getByRole('button', { name: /Tambah Pembelian Baru/i })
    );
    expect(captured.addPortalProps?.isOpen).toBe(true);

    captured.addPortalProps?.onClose();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(captured.addPortalProps?.isOpen).toBe(false);
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['purchases'],
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('card').getAttribute('data-class')).toContain(
      'opacity-75'
    );
  });
});
