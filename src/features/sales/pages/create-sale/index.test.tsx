import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import CreateSalePage from './index';

const { refetchItemsMock } = vi.hoisted(() => ({
  refetchItemsMock: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../application/create-sale/useSaleForm', () => ({
  useSaleForm: () => ({
    addItem: vi.fn(),
    customers: [],
    doctors: [],
    formData: {
      customer_id: '',
      date: '2026-06-16',
      doctor_id: '',
      invoice_number: '',
      patient_id: '',
      payment_method: 'cash',
    },
    handleChange: vi.fn(),
    handleSubmit: vi.fn(),
    handleUnitChange: vi.fn(),
    loading: false,
    patients: [],
    removeItem: vi.fn(),
    saleItems: [],
    total: 0,
    updateItem: vi.fn(),
  }),
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

vi.mock('../../application/create-sale/useSaleItemSelectionEffect', () => ({
  useSaleItemSelectionEffect: vi.fn(),
}));

vi.mock('@/features/sales/components/SaleInfoSection', () => ({
  default: () => <div data-testid="sale-info-section" />,
}));

vi.mock('@/features/sales/components/SaleItemsSection', () => ({
  default: ({ onOpenAddItemPortal }: { onOpenAddItemPortal: () => void }) => (
    <button type="button" onClick={onOpenAddItemPortal}>
      Open add item
    </button>
  ),
}));

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

describe('CreateSalePage add item portal timers', () => {
  beforeEach(() => {
    refetchItemsMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clears pending close timers when the page unmounts', async () => {
    const view = render(<CreateSalePage />);

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

  it('does not let a stale close timer close a newly opened add item portal', async () => {
    render(<CreateSalePage />);

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
  });
});
