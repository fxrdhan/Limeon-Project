import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PurchaseInfoSection from './PurchaseInfoSection';

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

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >((props, ref) => <input ref={ref} {...props} />),
}));

vi.mock('@/components/dropdown', () => ({
  default: ({
    name,
    value,
    onChange,
    options,
    placeholder,
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ id: string; name: string }>;
    placeholder: string;
  }) => (
    <select
      aria-label={name}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/calendar', () => ({
  default: ({
    onChange,
    placeholder,
    minDate,
  }: {
    onChange: (value: Date | null) => void;
    placeholder?: string;
    minDate?: Date;
  }) => {
    const id = placeholder?.includes('jatuh tempo')
      ? 'due-date'
      : 'purchase-date';

    return (
      <div>
        <button type="button" onClick={() => onChange(new Date('2026-05-10'))}>
          {id}-set
        </button>
        <button type="button" onClick={() => onChange(null)}>
          {id}-clear
        </button>
        <span data-testid={`${id}-min`}>
          {minDate ? minDate.toISOString().slice(0, 10) : 'none'}
        </span>
      </div>
    );
  },
}));

vi.mock('@/components/descriptive-textarea', () => ({
  default: ({
    name,
    value,
    onChange,
    placeholder,
  }: {
    name: string;
    value: string;
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    placeholder: string;
  }) => (
    <textarea
      aria-label={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

describe('PurchaseInfoSection', () => {
  const baseFormData = {
    invoice_number: 'INV-001',
    supplier_id: 'sup-1',
    date: '2026-04-01',
    due_date: '2026-04-10',
    payment_status: 'unpaid',
    payment_method: 'cash',
    notes: 'catatan awal',
  };

  const suppliers = [
    { id: 'sup-1', name: 'Supplier A' },
    { id: 'sup-2', name: 'Supplier B' },
  ];

  it('maps field interactions into handleChange payloads', () => {
    const handleChange = vi.fn();
    const invoiceNumberInputRef = createRef<HTMLInputElement>();

    render(
      <PurchaseInfoSection
        formData={baseFormData}
        suppliers={suppliers}
        invoiceNumberInputRef={invoiceNumberInputRef}
        handleChange={handleChange}
      />
    );

    fireEvent.change(screen.getByDisplayValue('INV-001'), {
      target: { name: 'invoice_number', value: 'INV-002' },
    });
    fireEvent.change(screen.getByLabelText('supplier_id'), {
      target: { value: 'sup-2' },
    });
    fireEvent.change(screen.getByLabelText('payment_status'), {
      target: { value: 'paid' },
    });
    fireEvent.change(screen.getByLabelText('payment_method'), {
      target: { value: 'transfer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'purchase-date-set' }));
    fireEvent.click(screen.getByRole('button', { name: 'due-date-set' }));
    fireEvent.click(screen.getByRole('button', { name: 'due-date-clear' }));
    fireEvent.change(screen.getByLabelText('notes'), {
      target: { name: 'notes', value: 'catatan baru' },
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'supplier_id',
          value: 'sup-2',
        }),
      })
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'payment_status',
          value: 'paid',
        }),
      })
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'payment_method',
          value: 'transfer',
        }),
      })
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'date',
          value: '2026-05-10',
        }),
      })
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'due_date',
          value: '2026-05-10',
        }),
      })
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'due_date',
          value: '',
        }),
      })
    );
  });

  it('passes purchase date as minimum due date constraint', () => {
    render(
      <PurchaseInfoSection
        formData={baseFormData}
        suppliers={suppliers}
        invoiceNumberInputRef={createRef<HTMLInputElement>()}
        handleChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('due-date-min')).toHaveTextContent('2026-04-01');
  });
});
