import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseItemsSection from './PurchaseItemsSection';
import type { Item, PurchaseItem } from '@/types';

const purchaseItemRowPropsSpy = vi.hoisted(() => vi.fn());
const itemSearchBarPropsSpy = vi.hoisted(() => vi.fn());

vi.mock('@/components/form-section', () => ({
  default: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/features/purchase-management/components/item-search', () => ({
  default: React.forwardRef(
    (
      props: {
        searchItem: string;
        onSearchItemChange: (value: string) => void;
        onSelectItem: (item: Item | null) => void;
        onOpenAddItemPortal: () => void;
      },
      ref: React.ForwardedRef<unknown>
    ) => {
      void ref;
      itemSearchBarPropsSpy(props);
      return (
        <div data-testid="item-search-bar">
          <span>{props.searchItem}</span>
          <button type="button" onClick={() => props.onSearchItemChange('vit')}>
            change-search
          </button>
          <button type="button" onClick={() => props.onSelectItem(null)}>
            clear-selected
          </button>
          <button type="button" onClick={props.onOpenAddItemPortal}>
            open-add-item
          </button>
        </div>
      );
    }
  ),
}));

vi.mock('@/components/checkbox', () => ({
  default: ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <label>
      {label}
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  ),
}));

vi.mock('@/components/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
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
  }: {
    children: React.ReactNode;
    colSpan?: number;
  }) => <td colSpan={colSpan}>{children}</td>,
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
}));

vi.mock(
  '@/features/purchase-management/components/purchase-form/PurchaseItemRow',
  () => ({
    default: (props: {
      item: PurchaseItem;
      itemCode: string;
      unitOptions: Array<{ id: string; name: string }>;
      isVatIncluded: boolean;
      onQuantityChange: (id: string, value: number) => void;
      onPriceChange: (id: string, value: number) => void;
      onDiscountChange: (id: string, value: number) => void;
      onVatChange: (id: string, value: number) => void;
      onUnitChange: (id: string, unitName: string) => void;
      onBatchNoChange: (id: string, value: string) => void;
      onExpiryDateChange: (id: string, value: string) => void;
      onRemove: (id: string) => void;
    }) => {
      purchaseItemRowPropsSpy(props);
      return (
        <tr data-testid={`row-${props.item.id}`}>
          <td>{props.itemCode}</td>
          <td>{props.unitOptions.map(option => option.name).join('|')}</td>
          <td>{props.isVatIncluded ? 'vat-included' : 'vat-excluded'}</td>
          <td>
            <button
              type="button"
              onClick={() => props.onQuantityChange(props.item.id, 3)}
            >
              qty
            </button>
            <button
              type="button"
              onClick={() => props.onPriceChange(props.item.id, 15000)}
            >
              price
            </button>
            <button
              type="button"
              onClick={() => props.onDiscountChange(props.item.id, 15)}
            >
              discount
            </button>
            <button
              type="button"
              onClick={() => props.onVatChange(props.item.id, 12)}
            >
              vat
            </button>
            <button
              type="button"
              onClick={() => props.onUnitChange(props.item.id, 'Box')}
            >
              unit
            </button>
            <button
              type="button"
              onClick={() => props.onBatchNoChange(props.item.id, 'B-01')}
            >
              batch
            </button>
            <button
              type="button"
              onClick={() =>
                props.onExpiryDateChange(props.item.id, '2027-01-01')
              }
            >
              expiry
            </button>
            <button type="button" onClick={() => props.onRemove(props.item.id)}>
              remove
            </button>
          </td>
        </tr>
      );
    },
  })
);

vi.mock(
  '@/features/purchase-management/components/purchase-form/VatPercentageEditor',
  () => ({
    default: ({
      vatPercentage,
      onVatPercentageChange,
    }: {
      vatPercentage: number;
      onVatPercentageChange: (value: number) => void;
    }) => (
      <input
        aria-label="vat-percentage"
        value={vatPercentage}
        onChange={e => onVatPercentageChange(Number(e.target.value))}
      />
    ),
  })
);

const makeCatalogItem = (): Item => ({
  id: 'item-1',
  name: 'Paracetamol',
  code: 'ITM-001',
  manufacturer: { id: 'man-1', name: 'Manufacturer A' },
  barcode: null,
  image_urls: null,
  base_price: 10000,
  sell_price: 12000,
  stock: 100,
  base_unit: 'Unit',
  package_conversions: [
    {
      id: 'conv-1',
      unit_name: 'Box',
      to_unit_id: 'box',
      conversion_rate: 10,
      base_price: 9000,
      sell_price: 11000,
      unit: { id: 'box', name: 'Box' },
    },
    {
      id: 'conv-2',
      unit_name: 'Box',
      to_unit_id: 'box',
      conversion_rate: 10,
      base_price: 9000,
      sell_price: 11000,
      unit: { id: 'box', name: 'Box' },
    },
    {
      id: 'conv-3',
      unit_name: 'Strip',
      to_unit_id: 'strip',
      conversion_rate: 5,
      base_price: 9500,
      sell_price: 11500,
      unit: { id: 'strip', name: 'Strip' },
    },
  ],
  category: { name: 'Category A' },
  type: { name: 'Type A' },
  package: { name: 'Package A' },
  unit: { name: 'Unit' },
});

const makePurchaseItem = (
  overrides: Partial<PurchaseItem> = {}
): PurchaseItem => ({
  item: { name: 'Paracetamol', code: 'ITM-001' },
  id: 'row-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 10000,
  discount: 0,
  subtotal: 20000,
  unit: 'Unit',
  vat_percentage: 11,
  batch_no: null,
  expiry_date: null,
  unit_conversion_rate: 1,
  ...overrides,
});

const buildProps = (
  overrides: Partial<React.ComponentProps<typeof PurchaseItemsSection>> = {}
) => {
  const catalogItem = makeCatalogItem();
  const handlers = {
    onSearchItemChange: vi.fn(),
    onSelectItem: vi.fn(),
    onOpenAddItemPortal: vi.fn(),
    updateItem: vi.fn(),
    updateItemVat: vi.fn(),
    onHandleUnitChange: vi.fn(),
    updateItemBatchNo: vi.fn(),
    updateItemExpiry: vi.fn(),
    removeItem: vi.fn(),
    handleChange: vi.fn(),
  };

  const props: React.ComponentProps<typeof PurchaseItemsSection> = {
    searchItem: 'para',
    onSearchItemChange: handlers.onSearchItemChange,
    items: [catalogItem],
    selectedItem: null,
    onSelectItem: handlers.onSelectItem,
    purchaseItems: [],
    isAddNewItemDisabled: false,
    onOpenAddItemPortal: handlers.onOpenAddItemPortal,
    itemSearchBarRef: createRef(),
    formData: {
      is_vat_included: true,
      vat_percentage: 11,
    },
    total: 50000,
    getItemById: id => (id === 'item-1' ? catalogItem : undefined),
    updateItem: handlers.updateItem,
    updateItemVat: handlers.updateItemVat,
    onHandleUnitChange: handlers.onHandleUnitChange,
    updateItemBatchNo: handlers.updateItemBatchNo,
    updateItemExpiry: handlers.updateItemExpiry,
    removeItem: handlers.removeItem,
    handleChange: handlers.handleChange,
    ...overrides,
  };

  return { props, handlers };
};

describe('PurchaseItemsSection', () => {
  it('renders empty state and translates VAT controls into synthetic handleChange events', () => {
    const { props, handlers } = buildProps();
    render(<PurchaseItemsSection {...props} />);

    expect(screen.getByText('Belum ada item ditambahkan')).toBeInTheDocument();
    expect(screen.getByText(/Rp/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('PPN Termasuk Harga'));
    fireEvent.change(screen.getByLabelText('vat-percentage'), {
      target: { value: '12' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'change-search' }));
    fireEvent.click(screen.getByRole('button', { name: 'clear-selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'open-add-item' }));

    expect(handlers.handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'is_vat_included',
          type: 'checkbox',
          checked: false,
          value: 'false',
        }),
      })
    );
    expect(handlers.handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'vat_percentage',
          value: '12',
        }),
      })
    );
    expect(handlers.onSearchItemChange).toHaveBeenCalledWith('vit');
    expect(handlers.onSelectItem).toHaveBeenCalledWith(null);
    expect(handlers.onOpenAddItemPortal).toHaveBeenCalledTimes(1);
  });

  it('builds row props from item catalog and delegates row handlers', () => {
    const { props, handlers } = buildProps({
      formData: {
        is_vat_included: false,
        vat_percentage: 11,
      },
      purchaseItems: [
        makePurchaseItem(),
        makePurchaseItem({ id: 'row-2', item_id: 'missing-item' }),
      ],
    });

    render(<PurchaseItemsSection {...props} />);

    expect(screen.getByText('VAT')).toBeInTheDocument();
    expect(screen.getByTestId('row-row-1')).toHaveTextContent('ITM-001');
    expect(screen.getByTestId('row-row-1')).toHaveTextContent('Unit|Box|Strip');
    expect(screen.getByTestId('row-row-2')).toHaveTextContent('-');

    fireEvent.click(screen.getAllByRole('button', { name: 'qty' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'price' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'discount' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'vat' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'unit' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'batch' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'expiry' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);

    expect(handlers.updateItem).toHaveBeenCalledWith('row-1', 'quantity', 3);
    expect(handlers.updateItem).toHaveBeenCalledWith('row-1', 'price', 15000);
    expect(handlers.updateItem).toHaveBeenCalledWith('row-1', 'discount', 15);
    expect(handlers.updateItemVat).toHaveBeenCalledWith('row-1', 12);
    expect(handlers.onHandleUnitChange).toHaveBeenCalledWith('row-1', 'Box');
    expect(handlers.updateItemBatchNo).toHaveBeenCalledWith('row-1', 'B-01');
    expect(handlers.updateItemExpiry).toHaveBeenCalledWith(
      'row-1',
      '2027-01-01'
    );
    expect(handlers.removeItem).toHaveBeenCalledWith('row-1');
  });

  it('uses base unit only when package conversions are unavailable', () => {
    const itemWithoutConversions = {
      ...makeCatalogItem(),
      id: 'item-2',
      base_unit: 'Bottle',
      package_conversions: null,
    } as Item;

    const { props, handlers } = buildProps({
      formData: { is_vat_included: false, vat_percentage: 11 },
      purchaseItems: [makePurchaseItem({ id: 'row-x', item_id: 'item-2' })],
      getItemById: id => (id === 'item-2' ? itemWithoutConversions : undefined),
      items: [itemWithoutConversions],
    });

    render(<PurchaseItemsSection {...props} />);

    expect(screen.getByTestId('row-row-x')).toHaveTextContent('Bottle');
    expect(handlers.updateItem).not.toHaveBeenCalled();
  });
});
