import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PackageConversionInput from './PackageConversionInput';

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

vi.mock('@/components/dropdown', () => ({
  default: ({
    options,
    value,
    onChange,
    disabled,
  }: {
    options: Array<{ id: string; name: string }>;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      aria-label="package_conversion"
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="">-- Pilih Kemasan --</option>
      {options.map(option => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.ComponentPropsWithoutRef<'input'>
  >((props, ref) => <input ref={ref} {...props} />),
}));

describe('PackageConversionInput', () => {
  const units = [
    { id: 'unit-1', name: 'Strip' },
    { id: 'unit-2', name: 'Box' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates selected unit and conversion rate through onFormDataChange', () => {
    const onFormDataChange = vi.fn();

    render(
      <PackageConversionInput
        baseUnit="Tablet"
        availableUnits={units}
        formData={{ unit: '', conversion_rate: 0 }}
        onFormDataChange={onFormDataChange}
        onAddConversion={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('package_conversion'), {
      target: { value: 'unit-2' },
    });
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '2.5' },
    });

    expect(onFormDataChange).toHaveBeenNthCalledWith(1, {
      unit: 'Box',
      conversion_rate: 0,
    });
    expect(onFormDataChange).toHaveBeenNthCalledWith(2, {
      unit: '',
      conversion_rate: 2.5,
    });
  });

  it('submits add conversion with Enter key and button click when enabled', () => {
    const onAddConversion = vi.fn();

    render(
      <PackageConversionInput
        baseUnit="Tablet"
        availableUnits={units}
        formData={{ unit: 'Strip', conversion_rate: 10 }}
        onFormDataChange={vi.fn()}
        onAddConversion={onAddConversion}
      />
    );

    const conversionInput = screen.getByRole('spinbutton');
    fireEvent.keyDown(conversionInput, { key: 'Enter' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Tambah konversi kemasan' })
    );

    expect(onAddConversion).toHaveBeenCalledTimes(2);
  });

  it('prevents add conversion action when disabled', () => {
    const onAddConversion = vi.fn();

    render(
      <PackageConversionInput
        baseUnit="Tablet"
        availableUnits={units}
        formData={{ unit: 'Strip', conversion_rate: 8 }}
        onFormDataChange={vi.fn()}
        onAddConversion={onAddConversion}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', {
      name: 'Tambah konversi kemasan',
    });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onAddConversion).not.toHaveBeenCalled();
  });

  it('shows fallback base unit text and dynamic conversion label', () => {
    render(
      <PackageConversionInput
        baseUnit=""
        availableUnits={units}
        formData={{ unit: 'Strip', conversion_rate: 0 }}
        onFormDataChange={vi.fn()}
        onAddConversion={vi.fn()}
      />
    );

    expect(
      screen.getByText('1 Kemasan Dasar setara berapa kemasan turunan?')
    ).toBeInTheDocument();
    expect(screen.getByText('1 Kemasan Dasar = ? Strip')).toBeInTheDocument();
  });
});
