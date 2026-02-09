import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SmartItemFormField from './SmartItemFormField';

const useItemFormMock = vi.hoisted(() => vi.fn());
const useItemRealtimeMock = vi.hoisted(() => vi.fn());
const smartInputProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

interface MockSmartInputProps {
  fieldName: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  smartFormSync?: unknown;
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
}

vi.mock('@/components/smartinput', () => ({
  default: (props: MockSmartInputProps) => {
    smartInputProps.push(props);
    return (
      <input
        data-testid="smart-item-input"
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
      />
    );
  },
}));

vi.mock('../../shared/contexts/useItemFormContext', () => ({
  useItemForm: useItemFormMock,
  useItemRealtime: useItemRealtimeMock,
}));

describe('SmartItemFormField', () => {
  beforeEach(() => {
    useItemFormMock.mockReset();
    useItemRealtimeMock.mockReset();
    smartInputProps.length = 0;
  });

  it('maps text field correctly and updates string value', () => {
    const updateFormData = vi.fn();
    const smartFormSync = { hasPendingUpdate: vi.fn(() => false) };
    useItemFormMock.mockReturnValue({
      formData: {
        name: 'Initial Name',
        code: 'ITM-1',
        barcode: '',
        description: '',
        base_price: 0,
        sell_price: 0,
        min_stock: 0,
        quantity: 0,
      },
      updateFormData,
    });
    useItemRealtimeMock.mockReturnValue({ smartFormSync });

    render(
      <SmartItemFormField
        fieldName="itemName"
        label="Nama Item"
        placeholder="isi nama"
      />
    );

    expect(smartInputProps[0]).toMatchObject({
      fieldName: 'name',
      value: 'Initial Name',
      label: 'Nama Item',
      smartFormSync,
    });

    fireEvent.change(screen.getByTestId('smart-item-input'), {
      target: { value: 'Updated Name' },
    });
    expect(updateFormData).toHaveBeenCalledWith({ name: 'Updated Name' });
  });

  it('parses numeric input and falls back to zero for invalid numbers', () => {
    const updateFormData = vi.fn();
    useItemFormMock.mockReturnValue({
      formData: {
        name: '',
        code: '',
        barcode: '',
        description: '',
        base_price: 100,
        sell_price: 150,
        min_stock: 1,
        quantity: 2,
      },
      updateFormData,
    });
    useItemRealtimeMock.mockReturnValue(undefined);

    render(
      <SmartItemFormField
        fieldName="basePrice"
        label="Harga Dasar"
        type="number"
        className="price-input"
      />
    );

    expect(smartInputProps[0]).toMatchObject({
      fieldName: 'base_price',
      value: '100',
      type: 'number',
      className: 'price-input',
    });

    const input = screen.getByTestId('smart-item-input');
    fireEvent.change(input, { target: { value: '125.5' } });
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(updateFormData).toHaveBeenNthCalledWith(1, { base_price: 125.5 });
    expect(updateFormData).toHaveBeenNthCalledWith(2, { base_price: 0 });
  });
});
