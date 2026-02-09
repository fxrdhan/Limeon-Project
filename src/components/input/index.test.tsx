import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import Input from './index';

const fieldValidationState = vi.hoisted(() => ({
  validation: {
    isValid: true,
    error: null as string | null,
    showError: false,
  },
  handleBlur: vi.fn(),
  clearError: vi.fn(),
}));

const validationOverlayProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/hooks/forms/useFieldValidation', () => ({
  useFieldValidation: () => fieldValidationState,
}));

vi.mock('@/components/validation-overlay', () => ({
  default: (props: Record<string, unknown>) => {
    validationOverlayProps.current = props;
    return <div data-testid="validation-overlay" />;
  },
}));

describe('Input', () => {
  beforeEach(() => {
    fieldValidationState.validation = {
      isValid: true,
      error: null,
      showError: false,
    };
    fieldValidationState.handleBlur.mockReset();
    fieldValidationState.clearError.mockReset();
    validationOverlayProps.current = null;
  });

  it('forwards refs and handles normal text changes', () => {
    const onChange = vi.fn();
    const ref = React.createRef<HTMLInputElement>();

    render(
      <Input
        id="plain-input"
        ref={ref}
        label="Nama"
        value="Aspirin"
        onChange={onChange}
      />
    );

    expect(screen.getByText('Nama')).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByDisplayValue('Aspirin'));

    fireEvent.change(ref.current!, { target: { value: 'Ibuprofen' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('formats currency display and emits clean currency payload', () => {
    const onChange = vi.fn();

    render(<Input value="Rp 1200000" type="currency" onChange={onChange} />);

    const input = screen.getByDisplayValue('Rp 1.200.000');
    expect(input).toHaveAttribute('placeholder', 'Rp 0');

    fireEvent.focus(input);
    expect(input).toHaveDisplayValue('1200000');
    expect(input).toHaveAttribute('placeholder', '0');

    fireEvent.change(input, { target: { name: 'price', value: '1a2b3' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ name: 'price', value: 'Rp 123' }),
      })
    );

    fireEvent.blur(input);
    expect(input).toHaveDisplayValue('Rp 1.200.000');
  });

  it('propagates validation state and clears validation on typing after blur', () => {
    fieldValidationState.validation = {
      isValid: false,
      error: 'Wajib diisi',
      showError: true,
    };
    const onValidationChange = vi.fn();
    const onChange = vi.fn();

    render(
      <Input
        value="abc"
        onChange={onChange}
        validate={true}
        validationSchema={z.string().min(5)}
        onValidationChange={onValidationChange}
      />
    );

    expect(onValidationChange).toHaveBeenCalledWith(false, 'Wajib diisi');
    const input = screen.getByDisplayValue('abc');
    fireEvent.blur(input);
    expect(fieldValidationState.handleBlur).toHaveBeenCalled();
    expect(validationOverlayProps.current).toMatchObject({ showError: true });

    fireEvent.change(input, { target: { value: 'abcd' } });
    expect(fieldValidationState.clearError).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
  });

  it('shows full-text overlay only when hovered and text overflows', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return this.tagName === 'SPAN' ? 500 : 0;
      },
    });

    render(
      <Input
        value="Ini adalah teks yang sangat panjang sehingga melebihi lebar input"
        onChange={vi.fn()}
        fullWidth={false}
      />
    );

    const input = screen.getByDisplayValue(
      'Ini adalah teks yang sangat panjang sehingga melebihi lebar input'
    );
    fireEvent.mouseEnter(input);
    expect(
      screen.getByText(
        'Ini adalah teks yang sangat panjang sehingga melebihi lebar input'
      )
    ).toBeInTheDocument();

    fireEvent.mouseLeave(input);
    expect(
      screen.queryByText(
        'Ini adalah teks yang sangat panjang sehingga melebihi lebar input'
      )
    ).not.toBeInTheDocument();

    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', descriptor);
    }
  });
});
