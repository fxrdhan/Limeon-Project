import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import AddPurchasePortal from './AddPurchasePortal';

const { handleSubmitMock, refetchItemsMock } = vi.hoisted(() => ({
  handleSubmitMock: vi.fn(),
  refetchItemsMock: vi.fn(),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get:
        (_target, element) =>
        ({
          children,
          animate: _animate,
          exit: _exit,
          initial: _initial,
          transition: _transition,
          variants: _variants,
          ...props
        }: React.HTMLAttributes<HTMLElement> & {
          animate?: unknown;
          children?: React.ReactNode;
          exit?: unknown;
          initial?: unknown;
          transition?: unknown;
          variants?: unknown;
        }) =>
          React.createElement(element as string, props, children),
    }
  ),
}));

vi.mock('@/components/form-action', () => ({
  default: () => <div data-testid="form-action" />,
}));

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseModalHeader',
  () => ({
    default: () => <div data-testid="purchase-modal-header" />,
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseInfoSection',
  () => ({
    default: ({
      invoiceNumberInputRef,
    }: {
      invoiceNumberInputRef: React.RefObject<HTMLInputElement | null>;
    }) => (
      <input
        ref={invoiceNumberInputRef}
        aria-label="Invoice number"
        data-testid="invoice-number"
      />
    ),
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseItemsSection',
  () => ({
    default: ({ onOpenAddItemPortal }: { onOpenAddItemPortal: () => void }) => (
      <button type="button" onClick={onOpenAddItemPortal}>
        Open add item
      </button>
    ),
  })
);

vi.mock('@/features/item-management/public/ItemModal', () => ({
  default: ({
    isClosing,
    isOpen,
    onClose,
  }: {
    isClosing: boolean;
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-closing={String(isClosing)} data-testid="item-modal">
        <button type="button" onClick={onClose}>
          Close item modal
        </button>
      </div>
    ) : null,
}));

vi.mock('@/features/item-management/public/useItemSelection', () => ({
  useItemSelection: () => ({
    getItemById: vi.fn(),
    handleItemSearchChange: vi.fn(),
    handleSelectItem: vi.fn(),
    items: [],
    refetchItems: refetchItemsMock,
    searchItem: 'obat baru',
    selectedItem: null,
  }),
}));

vi.mock(
  '@/features/purchase-management/application/form/useItemSelectionEffect',
  () => ({
    useItemSelectionEffect: vi.fn(),
  })
);

vi.mock(
  '@/features/purchase-management/application/form/usePurchaseForm',
  () => ({
    usePurchaseForm: () => ({
      addItem: vi.fn(),
      formData: {
        date: '2026-06-16',
        invoice_number: '',
        payment_method: 'cash',
        supplier_id: '',
      },
      handleChange: vi.fn(),
      handleSubmit: handleSubmitMock,
      handleUnitChange: vi.fn(),
      loading: false,
      purchaseItems: [],
      removeItem: vi.fn(),
      suppliers: [],
      total: 0,
      updateItem: vi.fn(),
      updateItemBatchNo: vi.fn(),
      updateItemExpiry: vi.fn(),
      updateItemVat: vi.fn(),
    }),
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/usePurchaseModalAnimation',
  () => ({
    usePurchaseModalAnimation: () => ({
      backdropVariants: {},
      contentVariants: {},
      modalVariants: {},
    }),
  })
);

const renderAddPurchasePortal = (overrides?: {
  isOpen?: boolean;
  onClose?: () => void;
  setIsClosing?: React.Dispatch<React.SetStateAction<boolean>>;
}) =>
  render(
    <AddPurchasePortal
      isOpen={overrides?.isOpen ?? true}
      onClose={overrides?.onClose ?? vi.fn()}
      isClosing={false}
      setIsClosing={overrides?.setIsClosing ?? vi.fn()}
    />
  );

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(promiseResolve => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

describe('AddPurchasePortal add item portal timers', () => {
  beforeEach(() => {
    handleSubmitMock.mockReset();
    handleSubmitMock.mockResolvedValue(true);
    refetchItemsMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale add item close timer hide a reopened item modal', async () => {
    renderAddPurchasePortal();

    fireEvent.click(screen.getByRole('button', { name: 'Open add item' }));
    await screen.findByTestId('item-modal');

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Close item modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open add item' }));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(refetchItemsMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('item-modal')).toBeTruthy();
    expect(screen.getByTestId('item-modal').dataset.closing).toBe('false');
  });

  it('clears pending add item timers when unmounted', async () => {
    const view = renderAddPurchasePortal();

    fireEvent.click(screen.getByRole('button', { name: 'Open add item' }));
    await screen.findByTestId('item-modal');

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Close item modal' }));
    view.unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refetchItemsMock).not.toHaveBeenCalled();
  });

  it('clears pending add item timers when the purchase portal closes', async () => {
    const view = renderAddPurchasePortal();

    fireEvent.click(screen.getByRole('button', { name: 'Open add item' }));
    await screen.findByTestId('item-modal');

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Close item modal' }));

    view.rerender(
      <AddPurchasePortal
        isOpen={false}
        onClose={vi.fn()}
        isClosing={false}
        setIsClosing={vi.fn()}
      />
    );

    expect(screen.queryByTestId('item-modal')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refetchItemsMock).not.toHaveBeenCalled();
  });

  it('clears pending invoice focus timer when unmounted', () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const view = renderAddPurchasePortal();

    const focusTimerResult = setTimeoutSpy.mock.results.find(
      (result, index) => {
        const delay = setTimeoutSpy.mock.calls[index]?.[1];
        return delay === 150 && result.type === 'return';
      }
    );

    view.unmount();

    expect(focusTimerResult).toBeDefined();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(focusTimerResult?.value);
  });

  it('keeps the purchase portal open when submit does not succeed', async () => {
    handleSubmitMock.mockResolvedValueOnce(false);
    const onClose = vi.fn();
    const setIsClosing = vi.fn();
    renderAddPurchasePortal({ onClose, setIsClosing });

    const form = screen.getByTestId('form-action').closest('form');
    expect(form).not.toBeNull();

    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
      await Promise.resolve();
    });

    expect(handleSubmitMock).toHaveBeenCalledOnce();
    expect(setIsClosing).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close from a stale submit after the purchase portal starts closing', async () => {
    const submit = createDeferred<boolean>();
    handleSubmitMock.mockReturnValueOnce(submit.promise);
    const onClose = vi.fn();
    const setIsClosing = vi.fn();
    const view = renderAddPurchasePortal({ onClose, setIsClosing });

    const form = screen.getByTestId('form-action').closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form as HTMLFormElement);
    });

    view.rerender(
      <AddPurchasePortal
        isOpen
        onClose={onClose}
        isClosing
        setIsClosing={setIsClosing}
      />
    );

    await act(async () => {
      submit.resolve(true);
      await submit.promise;
      await Promise.resolve();
    });

    expect(setIsClosing).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
