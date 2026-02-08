import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  GenericEditInPlace,
  MARGIN_CONFIG,
  MIN_STOCK_CONFIG,
  MarginEditInPlace,
  MinStockEditInPlace,
  createEditInPlaceComponent,
} from './GenericEditInPlaceFactory';

vi.mock('@/components/form-field', () => ({
  default: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.ComponentPropsWithoutRef<'input'>
  >((props, ref) => <input ref={ref} {...props} />),
}));

const createHandlers = () => ({
  onStartEdit: vi.fn(),
  onStopEdit: vi.fn(),
  onChange: vi.fn(),
  onKeyDown: vi.fn(),
});

describe('GenericEditInPlaceFactory', () => {
  it('supports display mode interactions for margin config', () => {
    const handlers = createHandlers();

    render(
      <GenericEditInPlace
        isEditing={false}
        value={12.3}
        inputValue="12.3"
        tabIndex={11}
        config={MARGIN_CONFIG}
        {...handlers}
      />
    );

    const displayValue = screen.getByText('12.3 %');
    const displayContainer = displayValue.closest('div');
    expect(displayContainer).toBeTruthy();
    if (!displayContainer) return;

    expect(displayContainer.className).toContain('text-green-600');

    fireEvent.click(displayContainer);
    fireEvent.keyDown(displayContainer, { key: 'Enter' });
    fireEvent.keyDown(displayContainer, { key: ' ' });
    fireEvent.click(screen.getByTitle('Edit margin'));

    expect(handlers.onStartEdit).toHaveBeenCalledTimes(4);
  });

  it('uses empty display fallback when formatter returns empty value', () => {
    const handlers = createHandlers();

    render(
      <GenericEditInPlace
        isEditing={false}
        value={null}
        inputValue=""
        tabIndex={8}
        config={MARGIN_CONFIG}
        {...handlers}
      />
    );

    const displayValue = screen.getByText('-');
    expect(displayValue).toBeInTheDocument();
    expect(displayValue.closest('div')?.className).toContain('text-slate-500');
  });

  it('renders edit mode input and delegates blur/change/key handlers', () => {
    const handlers = createHandlers();

    render(
      <GenericEditInPlace
        isEditing={true}
        value={20}
        inputValue="20"
        tabIndex={9}
        config={MARGIN_CONFIG}
        {...handlers}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '21' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    expect(handlers.onChange).toHaveBeenCalledTimes(1);
    expect(handlers.onKeyDown).toHaveBeenCalledTimes(1);
    expect(handlers.onStopEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('prevents edit interactions when disabled', () => {
    const handlers = createHandlers();

    render(
      <GenericEditInPlace
        isEditing={false}
        value={10}
        inputValue="10"
        tabIndex={12}
        config={MARGIN_CONFIG}
        disabled={true}
        {...handlers}
      />
    );

    const displayValue = screen.getByText('10.0 %');
    const displayContainer = displayValue.closest('div');
    expect(displayContainer).toBeTruthy();
    if (!displayContainer) return;

    fireEvent.click(displayContainer);
    fireEvent.keyDown(displayContainer, { key: 'Enter' });

    expect(screen.queryByTitle('Edit margin')).not.toBeInTheDocument();
    expect(handlers.onStartEdit).not.toHaveBeenCalled();
  });

  it('merges custom config from createEditInPlaceComponent', () => {
    const handlers = createHandlers();
    const CustomMinStock = createEditInPlaceComponent(MIN_STOCK_CONFIG);

    render(
      <CustomMinStock
        isEditing={false}
        value={7}
        inputValue="7"
        tabIndex={13}
        {...handlers}
        config={{
          label: 'Stok Cadangan',
          display: {
            formatter: () => '7 unit',
          },
          classes: {
            display: 'custom-display-class',
          },
          accessibility: {
            editTitle: 'Edit stok cadangan',
          },
        }}
      />
    );

    expect(screen.getByText('Stok Cadangan')).toBeInTheDocument();
    const displayValue = screen.getByText('7 unit');
    expect(displayValue.closest('div')?.className).toContain(
      'custom-display-class'
    );

    fireEvent.click(screen.getByTitle('Edit stok cadangan'));
    expect(handlers.onStartEdit).toHaveBeenCalledTimes(1);
  });

  it('renders specialized margin and min-stock components from exported factories', () => {
    const marginHandlers = createHandlers();
    const minStockHandlers = createHandlers();

    const { rerender } = render(
      <MarginEditInPlace
        isEditing={false}
        value={-2}
        inputValue="-2"
        tabIndex={14}
        {...marginHandlers}
      />
    );
    expect(screen.getByText('-2.0 %')).toBeInTheDocument();

    rerender(
      <MinStockEditInPlace
        isEditing={false}
        value={15}
        inputValue="15"
        tabIndex={15}
        {...minStockHandlers}
      />
    );
    expect(screen.getByText('Stok Minimal:')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
