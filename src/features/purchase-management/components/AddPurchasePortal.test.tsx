import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddPurchasePortal from './AddPurchasePortal';

const handleSubmitMock = vi.hoisted(() => vi.fn());
const handleChangeMock = vi.hoisted(() => vi.fn());
const handleItemSearchChangeMock = vi.hoisted(() => vi.fn());
const handleSelectItemMock = vi.hoisted(() => vi.fn());
const refetchItemsMock = vi.hoisted(() => vi.fn());
const useItemSelectionEffectMock = vi.hoisted(() => vi.fn());
const itemSearchFocusMock = vi.hoisted(() => vi.fn());

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

vi.mock('@/features/purchase-management/hooks/purchaseForm', () => ({
  usePurchaseForm: () => ({
    formData: {
      supplier_id: '',
      invoice_number: 'INV-001',
      date: '2026-01-01',
      due_date: '',
      payment_status: 'unpaid',
      payment_method: 'cash',
      vat_percentage: 11,
      is_vat_included: true,
      notes: '',
    },
    suppliers: [{ id: 'sup-1', name: 'Supplier A' }],
    purchaseItems: [{ id: 'row-1' }],
    total: 10000,
    loading: false,
    handleChange: handleChangeMock,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    handleUnitChange: vi.fn(),
    updateItemVat: vi.fn(),
    updateItemExpiry: vi.fn(),
    updateItemBatchNo: vi.fn(),
    removeItem: vi.fn(),
    handleSubmit: handleSubmitMock,
  }),
}));

vi.mock('@/hooks/items/useItemSelection', () => ({
  useItemSelection: () => ({
    searchItem: 'vitamin',
    selectedItem: null,
    items: [],
    handleItemSearchChange: handleItemSearchChangeMock,
    handleSelectItem: handleSelectItemMock,
    getItemById: vi.fn(),
    refetchItems: refetchItemsMock,
  }),
}));

vi.mock('@/features/purchase-management/hooks/useItemSelectionEffect', () => ({
  useItemSelectionEffect: useItemSelectionEffectMock,
}));

vi.mock(
  '@/features/purchase-management/hooks/usePurchaseModalAnimation',
  () => ({
    usePurchaseModalAnimation: () => ({
      backdropVariants: {},
      modalVariants: {},
      contentVariants: {},
    }),
  })
);

vi.mock('@/components/form-action', () => ({
  default: ({
    onCancel,
    isDisabled,
  }: {
    onCancel: () => void;
    isDisabled: boolean;
  }) => (
    <div>
      <button type="button" onClick={onCancel}>
        cancel-form
      </button>
      <span>disabled:{String(isDisabled)}</span>
      <button type="submit">submit-form</button>
    </div>
  ),
}));

vi.mock('@/components/item-management/ItemModal', () => ({
  default: ({
    isOpen,
    isClosing,
    onClose,
    initialSearchQuery,
  }: {
    isOpen: boolean;
    isClosing: boolean;
    onClose: () => void;
    initialSearchQuery?: string;
  }) => (
    <div data-testid="item-modal">
      <span>open:{String(isOpen)}</span>
      <span>closing:{String(isClosing)}</span>
      <span>query:{initialSearchQuery}</span>
      <button type="button" onClick={onClose}>
        close-item-modal
      </button>
    </div>
  ),
}));

vi.mock('@/components/card', () => ({
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseModalHeader',
  () => ({
    default: ({ title }: { title: string }) => <div>{title}</div>,
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseInfoSection',
  () => ({
    default: () => <div>purchase-info-section</div>,
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseItemsSection',
  () => ({
    default: ({
      onOpenAddItemPortal,
      itemSearchBarRef,
    }: {
      onOpenAddItemPortal: () => void;
      itemSearchBarRef: React.MutableRefObject<{ focus: () => void } | null>;
    }) => {
      itemSearchBarRef.current = { focus: itemSearchFocusMock };

      return (
        <div>
          <button type="button" onClick={onOpenAddItemPortal}>
            open-add-item-portal
          </button>
        </div>
      );
    },
  })
);

describe('AddPurchasePortal', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    handleSubmitMock.mockReset();
    handleChangeMock.mockReset();
    handleItemSearchChangeMock.mockReset();
    handleSelectItemMock.mockReset();
    refetchItemsMock.mockReset();
    useItemSelectionEffectMock.mockReset();
    itemSearchFocusMock.mockReset();
  });

  it('handles backdrop click and cancel action', () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <AddPurchasePortal
        isOpen
        onClose={onClose}
        isClosing={false}
        setIsClosing={setIsClosing}
      />
    );

    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    fireEvent.click(screen.getByRole('button', { name: 'cancel-form' }));

    expect(setIsClosing).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('submits form and triggers close flow', () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <AddPurchasePortal
        isOpen
        onClose={onClose}
        isClosing={false}
        setIsClosing={setIsClosing}
      />
    );

    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(handleSubmitMock).toHaveBeenCalledTimes(1);
    expect(setIsClosing).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens and closes add-item modal with refetch and refocus sequence', async () => {
    const onClose = vi.fn();
    const setIsClosing = vi.fn();

    render(
      <AddPurchasePortal
        isOpen
        onClose={onClose}
        isClosing={false}
        setIsClosing={setIsClosing}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'open-add-item-portal' })
    );
    expect(screen.getByText('open:true')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close-item-modal' }));
    expect(screen.getByText('closing:true')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(refetchItemsMock).toHaveBeenCalledTimes(1);
    expect(itemSearchFocusMock).toHaveBeenCalledTimes(1);
  });
});
