import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseItemRow from './PurchaseItemRow';
import type { PurchaseItem } from '@/types';

vi.mock('@/components/table', () => ({
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableCell: ({
    children,
    className,
    colSpan,
  }: {
    children: React.ReactNode;
    className?: string;
    colSpan?: number;
  }) => (
    <td className={className} colSpan={colSpan}>
      {children}
    </td>
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

vi.mock('@/components/calendar', () => ({
  default: ({
    onChange,
    placeholder,
  }: {
    onChange: (value: Date | null) => void;
    placeholder?: string;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(new Date('2027-02-01'))}>
        set-date
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-date
      </button>
      <span>{placeholder}</span>
    </div>
  ),
}));

const makeItem = (overrides: Partial<PurchaseItem> = {}): PurchaseItem => ({
  item: { name: 'Paracetamol', code: 'ITM-001' },
  id: 'row-1',
  item_id: 'item-1',
  item_name: 'Paracetamol',
  quantity: 2,
  price: 10000,
  discount: 10,
  subtotal: 18000,
  unit: 'Unit',
  vat_percentage: 11,
  batch_no: 'BATCH-1',
  expiry_date: '2026-01-01',
  unit_conversion_rate: 1,
  ...overrides,
});

const renderRow = (
  options: {
    item?: PurchaseItem;
    isVatIncluded?: boolean;
    unitOptions?: Array<{ id: string; name: string }>;
  } = {}
) => {
  const handlers = {
    onQuantityChange: vi.fn(),
    onPriceChange: vi.fn(),
    onDiscountChange: vi.fn(),
    onVatChange: vi.fn(),
    onUnitChange: vi.fn(),
    onBatchNoChange: vi.fn(),
    onExpiryDateChange: vi.fn(),
    onRemove: vi.fn(),
  };

  const props = {
    item: options.item ?? makeItem(),
    index: 0,
    itemCode: 'ITM-001',
    unitOptions: options.unitOptions ?? [
      { id: 'unit', name: 'Unit' },
      { id: 'box', name: 'Box' },
    ],
    isVatIncluded: options.isVatIncluded ?? false,
    ...handlers,
  };

  const view = render(
    <table>
      <tbody>
        <PurchaseItemRow {...props} />
      </tbody>
    </table>
  );

  return { handlers, ...view };
};

describe('PurchaseItemRow', () => {
  it('updates batch, quantity, unit, price, and remove handlers', () => {
    const { handlers } = renderRow();

    fireEvent.change(screen.getByPlaceholderText('No. Batch'), {
      target: { value: 'BATCH-NEW' },
    });
    expect(handlers.onBatchNoChange).toHaveBeenCalledWith('row-1', 'BATCH-NEW');

    fireEvent.change(screen.getByDisplayValue('2'), {
      target: { value: '5' },
    });
    expect(handlers.onQuantityChange).toHaveBeenCalledWith('row-1', 5);

    fireEvent.change(screen.getByDisplayValue('Unit'), {
      target: { value: 'Box' },
    });
    expect(handlers.onUnitChange).toHaveBeenCalledWith('row-1', 'Box');

    fireEvent.change(screen.getByPlaceholderText('Rp 0'), {
      target: { value: 'Rp 25.000' },
    });
    expect(handlers.onPriceChange).toHaveBeenCalledWith('row-1', 25000);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handlers.onRemove).toHaveBeenCalledWith('row-1');
  });

  it('parses discount and VAT percentages with max cap and backspace behavior', () => {
    const { handlers } = renderRow({
      item: makeItem({ discount: 27, vat_percentage: 13 }),
    });

    const discountInput = screen.getByDisplayValue('27%') as HTMLInputElement;
    fireEvent.change(discountInput, { target: { value: '150%' } });
    expect(handlers.onDiscountChange).toHaveBeenCalledWith('row-1', 100);

    discountInput.selectionStart = discountInput.value.length;
    fireEvent.keyDown(discountInput, { key: 'Backspace' });
    expect(handlers.onDiscountChange).toHaveBeenCalledWith('row-1', 2);

    const vatInput = screen.getByDisplayValue('13%') as HTMLInputElement;
    fireEvent.change(vatInput, { target: { value: '101%' } });
    expect(handlers.onVatChange).toHaveBeenCalledWith('row-1', 100);

    vatInput.selectionStart = vatInput.value.length;
    fireEvent.keyDown(vatInput, { key: 'Backspace' });
    expect(handlers.onVatChange).toHaveBeenCalledWith('row-1', 1);
  });

  it('handles quantity edge cases and expiry date conversion', () => {
    const { handlers } = renderRow({
      item: makeItem({ quantity: 0 }),
    });

    const quantityInput = screen.getByDisplayValue('0') as HTMLInputElement;
    const selectSpy = vi.spyOn(quantityInput, 'select');

    fireEvent.focus(quantityInput);
    fireEvent.click(quantityInput);
    expect(selectSpy).toHaveBeenCalledTimes(2);

    fireEvent.change(quantityInput, { target: { value: 'abc' } });
    expect(handlers.onQuantityChange).not.toHaveBeenCalledWith('row-1', NaN);

    fireEvent.change(quantityInput, { target: { value: '' } });
    expect(handlers.onQuantityChange).toHaveBeenCalledWith('row-1', 0);

    fireEvent.blur(quantityInput);
    expect(handlers.onQuantityChange).toHaveBeenCalledWith('row-1', 1);

    fireEvent.click(screen.getByRole('button', { name: 'set-date' }));
    expect(handlers.onExpiryDateChange).toHaveBeenCalledWith(
      'row-1',
      '2027-02-01'
    );

    fireEvent.click(screen.getByRole('button', { name: 'clear-date' }));
    expect(handlers.onExpiryDateChange).toHaveBeenCalledWith('row-1', '');
  });

  it('does not trim percentage value when backspace is not at input end', () => {
    const { handlers } = renderRow({
      item: makeItem({ discount: 34 }),
    });

    const discountInput = screen.getByDisplayValue('34%') as HTMLInputElement;
    discountInput.selectionStart = 1;
    fireEvent.keyDown(discountInput, { key: 'Backspace' });

    expect(handlers.onDiscountChange).not.toHaveBeenCalledWith('row-1', 3);
  });

  it('renders VAT input only when VAT is excluded from price', () => {
    const firstRender = renderRow({
      isVatIncluded: false,
      item: makeItem({ discount: 0 }),
    });
    expect(screen.getAllByPlaceholderText('0%')).toHaveLength(2);
    firstRender.unmount();

    renderRow({ isVatIncluded: true, item: makeItem({ discount: 0 }) });
    expect(screen.getAllByPlaceholderText('0%')).toHaveLength(1);
  });
});
