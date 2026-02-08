import { render } from '@testing-library/react';
import { z } from 'zod';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PriceInput from './PriceInput';

const capturedProps = vi.hoisted(() => ({
  formField: null as Record<string, unknown> | null,
  input: null as Record<string, unknown> | null,
}));

vi.mock('@/components/form-field', () => ({
  default: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & Record<string, unknown>) => {
    capturedProps.formField = props;
    return <div data-testid="form-field">{children}</div>;
  },
}));

vi.mock('@/components/input', () => ({
  default: (props: Record<string, unknown>) => {
    capturedProps.input = props;
    return <input data-testid="price-input" />;
  },
}));

describe('PriceInput', () => {
  beforeEach(() => {
    capturedProps.formField = null;
    capturedProps.input = null;
  });

  it('passes default form and input configuration', () => {
    const onChange = vi.fn();

    render(
      <PriceInput
        label="Harga Pokok"
        name="base_price"
        value="Rp 1000"
        onChange={onChange}
      />
    );

    expect(capturedProps.formField).toMatchObject({
      label: 'Harga Pokok',
      required: false,
    });
    expect(capturedProps.input).toMatchObject({
      type: 'currency',
      name: 'base_price',
      value: 'Rp 1000',
      onChange,
      min: '0',
      className: 'w-full',
      validate: false,
      required: false,
      readOnly: false,
      showValidationOnBlur: true,
      validationAutoHide: true,
      validationAutoHideDelay: 3000,
    });
  });

  it('enables validation and custom values when provided', () => {
    const onChange = vi.fn();
    const schema = z.string().min(1);

    render(
      <PriceInput
        label="Harga Jual"
        name="sell_price"
        value="Rp 2000"
        onChange={onChange}
        tabIndex={24}
        validationSchema={schema}
        required={true}
        min="500"
        className="custom-width"
        readOnly={true}
      />
    );

    expect(capturedProps.formField).toMatchObject({
      label: 'Harga Jual',
      required: true,
    });
    expect(capturedProps.input).toMatchObject({
      tabIndex: 24,
      min: '500',
      className: 'custom-width',
      validate: true,
      validationSchema: schema,
      required: true,
      readOnly: true,
    });
  });
});
