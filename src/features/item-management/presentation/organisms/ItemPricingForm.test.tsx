import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemPricingForm from './ItemPricingForm';

const capturedProps = vi.hoisted(() => ({
  priceInputByName: {} as Record<string, Record<string, unknown>>,
}));

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

vi.mock('@/components/switch', () => ({
  default: ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      aria-label="level-pricing-switch"
      checked={checked}
      disabled={disabled}
      onChange={event => onChange(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.ComponentPropsWithoutRef<'input'>
  >((props, ref) => (
    <input
      ref={ref}
      aria-label={String(props.name ?? props.placeholder ?? 'input')}
      {...props}
    />
  )),
}));

vi.mock('@/components/form-field', () => ({
  default: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    isLoading,
    disabled,
    ...props
  }: React.ComponentPropsWithoutRef<'button'> & {
    isLoading?: boolean;
  }) => (
    <button disabled={disabled || isLoading} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/formatters', () => ({
  formatRupiah: (value: number) => `Rp ${Math.round(value)}`,
}));

vi.mock('../atoms', () => ({
  PriceInput: (props: Record<string, unknown>) => {
    const name = String(props.name);
    capturedProps.priceInputByName[name] = props;
    return (
      <label>
        <span>{String(props.label)}</span>
        <input
          data-testid={`price-input-${name}`}
          value={String(props.value ?? '')}
          onChange={event =>
            (
              props.onChange as (
                event: React.ChangeEvent<HTMLInputElement>
              ) => void
            )?.(event)
          }
        />
      </label>
    );
  },
  MarginEditor: (props: Record<string, unknown>) => (
    <div data-testid="margin-editor">
      {String(props.marginPercentage ?? '')}
    </div>
  ),
}));

const createLevelPricing = () => ({
  levels: [{ id: 'lvl-1', level_name: 'Gold', price_percentage: 90 }],
  isLoading: false,
  discountByLevel: {} as Record<string, number>,
  onDiscountChange: vi.fn(),
  onCreateLevel: vi.fn(
    async (payload: {
      level_name: string;
      price_percentage: number;
      description?: string | null;
    }) => ({
      id: 'lvl-2',
      level_name: payload.level_name,
      price_percentage: payload.price_percentage,
      description: payload.description ?? null,
    })
  ),
  isCreating: false,
  onUpdateLevels: vi.fn(
    async (payload: { id: string; price_percentage: number }[]) => payload
  ),
  isUpdating: false,
  onDeleteLevel: vi.fn(
    async (payload: { id: string; levels: Array<{ id: string }> }) => ({
      id: payload.id,
    })
  ),
  isDeleting: false,
});

const createProps = (
  overrides: Partial<React.ComponentProps<typeof ItemPricingForm>> = {}
): React.ComponentProps<typeof ItemPricingForm> => ({
  isExpanded: true,
  onExpand: vi.fn(),
  stackClassName: '',
  stackStyle: undefined,
  formData: {
    base_price: 1000,
    sell_price: 1500,
    is_level_pricing_active: false,
  },
  displayBasePrice: 'Rp 1000',
  displaySellPrice: 'Rp 1500',
  baseUnit: 'Tablet',
  marginEditing: {
    isEditing: false,
    percentage: '25.5',
  },
  calculatedMargin: 25.5,
  onBasePriceChange: vi.fn(),
  onSellPriceChange: vi.fn(),
  onMarginChange: vi.fn(),
  onStartEditMargin: vi.fn(),
  onStopEditMargin: vi.fn(),
  onMarginInputChange: vi.fn(),
  onMarginKeyDown: vi.fn(),
  isLevelPricingActive: false,
  onLevelPricingActiveChange: vi.fn(),
  showLevelPricing: false,
  onShowLevelPricing: vi.fn(),
  onHideLevelPricing: vi.fn(),
  levelPricing: createLevelPricing(),
  disabled: false,
  ...overrides,
});

describe('ItemPricingForm', () => {
  beforeEach(() => {
    capturedProps.priceInputByName = {};
  });

  const openBaselineModal = (container: HTMLElement) => {
    const settingsButton = container.querySelector('button.mr-2');
    expect(settingsButton).toBeTruthy();
    if (!settingsButton) {
      return;
    }
    fireEvent.click(settingsButton);
  };

  it('handles default mode actions and base price auto margin update', () => {
    const onExpand = vi.fn();
    const onBasePriceChange = vi.fn();
    const onMarginChange = vi.fn();

    vi.useFakeTimers();

    render(
      <ItemPricingForm
        {...createProps({
          onExpand,
          onBasePriceChange,
          onMarginChange,
        })}
      />
    );

    fireEvent.click(screen.getByText('Harga Pokok & Jual'));
    expect(onExpand).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByTestId('price-input-base_price'), {
      target: { value: 'Rp 2200' },
    });
    expect(onBasePriceChange).toHaveBeenCalledTimes(1);

    act(() => {
      vi.runAllTimers();
    });
    expect(onMarginChange).toHaveBeenCalledWith('25.5');

    fireEvent.click(screen.getAllByRole('button')[0]);
    vi.useRealTimers();
  });

  it('handles level pricing mode interactions and hide callback', () => {
    const levelPricing = createLevelPricing();
    const onLevelPricingActiveChange = vi.fn();
    const onHideLevelPricing = vi.fn();

    render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
          onLevelPricingActiveChange,
          onHideLevelPricing,
        })}
      />
    );

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '12' },
    });
    expect(levelPricing.onDiscountChange).toHaveBeenCalledWith('lvl-1', '12');

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'level-pricing-switch' })
    );
    expect(onLevelPricingActiveChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText('Pengaturan Level Pelanggan'));
    expect(onHideLevelPricing).toHaveBeenCalledTimes(1);
  });

  it('calls delete baseline level action from baseline modal', async () => {
    const levelPricing = createLevelPricing();
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
        })}
      />
    );

    const settingsButton = container.querySelector('button.mr-2');
    expect(settingsButton).toBeTruthy();
    if (!settingsButton) return;

    fireEvent.click(settingsButton);
    expect(screen.getByText('Atur baseline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus level' }));
    await waitFor(() => {
      expect(levelPricing.onDeleteLevel).toHaveBeenCalledWith({
        id: 'lvl-1',
        levels: levelPricing.levels,
      });
    });
  });

  it('creates baseline level from baseline modal', async () => {
    const levelPricing = createLevelPricing();
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
        })}
      />
    );

    const settingsButton = container.querySelector('button.mr-2');
    expect(settingsButton).toBeTruthy();
    if (!settingsButton) return;

    fireEvent.click(settingsButton);
    expect(await screen.findByText('Atur baseline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    fireEvent.change(await screen.findByPlaceholderText('Level 2'), {
      target: { value: 'VIP' },
    });
    fireEvent.change(screen.getByPlaceholderText('Diskon (%)'), {
      target: { value: '15' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tambah level baseline',
      })
    );

    await waitFor(() => {
      expect(levelPricing.onCreateLevel).toHaveBeenCalledWith({
        level_name: 'VIP',
        price_percentage: 85,
        description: null,
      });
    });
  });

  it('opens menu, handles menu outside close and triggers level mode callback', async () => {
    const onShowLevelPricing = vi.fn();
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          onShowLevelPricing,
        })}
      />
    );

    const menuButton = container.querySelector('button.-ml-2');
    expect(menuButton).toBeTruthy();
    if (!menuButton) return;

    fireEvent.click(menuButton);
    const levelButton = await screen.findByRole('button', {
      name: 'Atur per-level',
    });
    fireEvent.click(levelButton);
    expect(onShowLevelPricing).toHaveBeenCalledTimes(1);

    fireEvent.click(menuButton);
    expect(
      await screen.findByRole('button', { name: 'Atur per-level' })
    ).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Atur per-level' })
      ).not.toBeInTheDocument();
    });
  });

  it('closes baseline with enter when unchanged and supports escape close', async () => {
    const levelPricing = createLevelPricing();
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
        })}
      />
    );

    openBaselineModal(container);
    const baselineTitle = await screen.findByText('Atur baseline');
    expect(baselineTitle).toBeInTheDocument();

    const discountInput = document.body.querySelector(
      'input.w-20.text-sm'
    ) as HTMLInputElement | null;
    expect(discountInput).toBeTruthy();
    if (!discountInput) return;
    fireEvent.keyDown(discountInput, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      charCode: 13,
    });

    await waitFor(() => {
      expect(screen.queryByText('Atur baseline')).not.toBeInTheDocument();
    });
    expect(levelPricing.onUpdateLevels).not.toHaveBeenCalled();

    openBaselineModal(container);
    expect(await screen.findByText('Atur baseline')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Atur baseline')).not.toBeInTheDocument();
    });
  });

  it('creates baseline from placeholder name and supports enter navigation', async () => {
    const levelPricing = createLevelPricing();
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
        })}
      />
    );

    openBaselineModal(container);
    expect(await screen.findByText('Atur baseline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    const nameInput = await screen.findByPlaceholderText('Level 2');
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    const discountInput = screen.getByPlaceholderText('Diskon (%)');
    expect(discountInput).toHaveFocus();
    fireEvent.change(discountInput, { target: { value: '12.5' } });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tambah level baseline',
      })
    );

    await waitFor(() => {
      expect(levelPricing.onCreateLevel).toHaveBeenCalledWith({
        level_name: 'Level 2',
        price_percentage: 87.5,
        description: null,
      });
    });
  });

  it('prevents level actions when disabled, deleting, or updating', async () => {
    const levelPricing = createLevelPricing();
    levelPricing.isDeleting = true;
    levelPricing.isUpdating = true;
    const { container } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing,
          disabled: true,
        })}
      />
    );

    const settingsButton = container.querySelector('button.mr-2');
    expect(settingsButton).toBeTruthy();
    if (!settingsButton) return;
    fireEvent.click(settingsButton);
    expect(screen.queryByText('Atur baseline')).not.toBeInTheDocument();

    const backButton = container.querySelector('button.p-1.text-slate-500');
    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.click(backButton);
    }
    expect(levelPricing.onDeleteLevel).not.toHaveBeenCalled();
    expect(levelPricing.onUpdateLevels).not.toHaveBeenCalled();
  });

  it('renders loading and empty level states', () => {
    const loadingLevelPricing = createLevelPricing();
    loadingLevelPricing.isLoading = true;
    const { rerender } = render(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing: loadingLevelPricing,
        })}
      />
    );
    expect(screen.getByText('Memuat level pelanggan...')).toBeInTheDocument();

    const emptyLevelPricing = createLevelPricing();
    emptyLevelPricing.levels = [];
    rerender(
      <ItemPricingForm
        {...createProps({
          showLevelPricing: true,
          levelPricing: emptyLevelPricing,
        })}
      />
    );
    expect(
      screen.getByText(
        'Belum ada level pelanggan. Tambahkan level baru di bawah.'
      )
    ).toBeInTheDocument();
  });
});
