import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import ItemSettingsForm from './ItemSettingsForm';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

vi.mock('@/components/form-field', () => ({
  default: ({ label, children }: { label: string; children: ReactNode }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/components/dropdown', () => ({
  default: ({
    name,
    value,
    onChange,
    disabled,
  }: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid={`dropdown-${name}`}>
      <span>{`${name}:${value}`}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('true')}
      >
        {`change-${name}-true`}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('false')}
      >
        {`change-${name}-false`}
      </button>
    </div>
  ),
}));

vi.mock('@/components/checkbox', () => ({
  default: React.forwardRef<
    HTMLLabelElement,
    {
      id: string;
      label: string;
      checked: boolean;
      disabled?: boolean;
      onChange: (checked: boolean) => void;
    }
  >(({ id, label, checked, disabled, onChange }, ref) => (
    <label ref={ref} htmlFor={id}>
      {label}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  )),
}));

vi.mock('../atoms', () => ({
  MinStockEditor: ({
    onStartEdit,
    onStopEdit,
    onChange,
    onKeyDown,
    disabled,
  }: {
    onStartEdit: () => void;
    onStopEdit: () => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={onStartEdit}>
        start-min-stock
      </button>
      <button type="button" disabled={disabled} onClick={onStopEdit}>
        stop-min-stock
      </button>
      <input
        data-testid="min-stock-input"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  ),
}));

vi.mock('../molecules/FefoTooltip', () => ({
  default: () => <span data-testid="fefo-tooltip">fefo-tooltip</span>,
}));

const baseProps = () => ({
  isExpanded: true,
  onExpand: vi.fn(),
  formData: {
    is_active: true,
    is_medicine: true,
    has_expiry_date: false,
    min_stock: 5,
  },
  minStockEditing: {
    isEditing: false,
    value: '5',
  },
  onFieldChange: vi.fn(),
  onStartEditMinStock: vi.fn(),
  onStopEditMinStock: vi.fn(),
  onMinStockChange: vi.fn(),
  onMinStockKeyDown: vi.fn(),
  onRequestNextSection: vi.fn(),
  disabled: false,
});

describe('ItemSettingsForm', () => {
  it('handles expand, status changes, min-stock actions, and expiry checkbox update', () => {
    const props = baseProps();

    render(<ItemSettingsForm {...props} />);

    const header = screen.getByRole('button', { name: 'Pengaturan Tambahan' });
    fireEvent.click(header);
    fireEvent.keyDown(header, { key: 'Enter' });
    fireEvent.keyDown(header, { key: ' ' });
    expect(props.onExpand).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByText('change-is_active-false'));
    fireEvent.click(screen.getByText('change-is_active-true'));
    expect(props.onFieldChange).toHaveBeenCalledWith('is_active', false);
    expect(props.onFieldChange).toHaveBeenCalledWith('is_active', true);

    fireEvent.click(screen.getByText('start-min-stock'));
    fireEvent.click(screen.getByText('stop-min-stock'));
    expect(props.onStartEditMinStock).toHaveBeenCalledTimes(1);
    expect(props.onStopEditMinStock).toHaveBeenCalledTimes(1);

    const minStockInput = screen.getByTestId('min-stock-input');
    fireEvent.change(minStockInput, { target: { value: '10' } });
    fireEvent.keyDown(minStockInput, { key: 'Enter' });
    expect(props.onMinStockChange).toHaveBeenCalled();
    expect(props.onMinStockKeyDown).toHaveBeenCalled();

    const expiryInput = screen.getByLabelText('Memiliki Tanggal Kadaluarsa');
    fireEvent.click(expiryInput);
    expect(props.onFieldChange).toHaveBeenCalledWith('has_expiry_date', true);
    expect(screen.getByTestId('fefo-tooltip')).toBeInTheDocument();
  });

  it('triggers next-section tab override and interaction start/end guards', () => {
    const props = baseProps();
    render(<ItemSettingsForm {...props} />);

    const section = screen
      .getByRole('button', { name: 'Pengaturan Tambahan' })
      .closest('section') as HTMLElement;
    const expiryLabel = screen.getByText('Memiliki Tanggal Kadaluarsa');
    const expiryInput = screen.getByLabelText('Memiliki Tanggal Kadaluarsa');

    fireEvent.keyDown(expiryLabel, { key: 'Tab' });
    fireEvent.keyDown(expiryInput, { key: 'Tab' });
    fireEvent.keyDown(expiryInput, { key: 'Tab', shiftKey: true });
    expect(props.onRequestNextSection).toHaveBeenCalledTimes(2);

    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focus(section);
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onStartEditMinStock).not.toHaveBeenCalled();
    expect(props.onFieldChange).not.toHaveBeenCalledWith('noop', false);

    const onInteractionStart = vi.fn();
    const onInteractionEnd = vi.fn();
    const { rerender } = render(
      <ItemSettingsForm
        {...props}
        onRequestNextSection={props.onRequestNextSection}
      />
    );

    rerender(
      <ItemSettingsForm
        {...props}
        onRequestNextSection={props.onRequestNextSection}
        onStartEditMinStock={props.onStartEditMinStock}
        onStopEditMinStock={props.onStopEditMinStock}
      />
    );

    fireEvent.focus(section);
    expect(onInteractionStart).not.toHaveBeenCalled();
    fireEvent.blur(section, { relatedTarget: outside });
    expect(onInteractionEnd).not.toHaveBeenCalled();

    const agPopup = document.createElement('div');
    agPopup.className = 'ag-popup';
    document.body.appendChild(agPopup);
    fireEvent.blur(section, { relatedTarget: outside });

    document.body.removeChild(agPopup);
    document.body.removeChild(outside);
  });

  it('disables controls when item is non-medicine or form is disabled', () => {
    const props = baseProps();
    const { rerender } = render(
      <ItemSettingsForm
        {...props}
        formData={{ ...props.formData, is_medicine: false }}
      />
    );

    const expiryInput = screen.getByLabelText('Memiliki Tanggal Kadaluarsa');
    expect(expiryInput).toBeDisabled();
    expect(screen.getByText('start-min-stock')).toBeEnabled();

    rerender(<ItemSettingsForm {...props} disabled={true} />);

    expect(screen.getByText('change-is_active-true')).toBeDisabled();
    expect(screen.getByText('start-min-stock')).toBeDisabled();
    expect(screen.getByLabelText('Memiliki Tanggal Kadaluarsa')).toBeDisabled();
  });
});
