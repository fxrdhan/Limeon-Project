import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemAdditionalInfoForm from './ItemAdditionalInfoForm';

const createOptimizedUnitDetailFetcherMock = vi.hoisted(() => vi.fn());
const unitDetailFetcherMock = vi.hoisted(() => vi.fn());
const hoverResultMock = vi.hoisted(() => vi.fn());

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...props}>{children as ReactNode}</div>
    ),
  },
}));

vi.mock('@/components/form-field', () => ({
  default: ({ label, children }: { label: string; children: ReactNode }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/components/input', () => ({
  default: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & {
      validate?: boolean;
      validationSchema?: unknown;
      showValidationOnBlur?: boolean;
      validationAutoHide?: boolean;
      validationAutoHideDelay?: number;
      fullWidth?: boolean;
    }
  >(({ validate, ...props }, ref) => (
    <input
      ref={ref}
      data-testid={props.name ? `input-${props.name}` : 'input-generic'}
      data-validate={String(Boolean(validate))}
      {...props}
    />
  )),
}));

vi.mock('@/components/dropdown', () => ({
  default: ({
    value,
    onChange,
    onFetchHoverDetail,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    onFetchHoverDetail?: (value: string) => Promise<unknown>;
    disabled?: boolean;
  }) => (
    <div>
      <span>dropdown-value:{value}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('unit-2')}
      >
        choose-unit
      </button>
      <button
        type="button"
        onClick={async () => {
          const result = await onFetchHoverDetail?.('unit-2');
          hoverResultMock(result);
        }}
      >
        hover-unit
      </button>
    </div>
  ),
}));

vi.mock('@/components/descriptive-textarea', () => ({
  default: ({
    name,
    value,
    readOnly,
    onChange,
  }: {
    name: string;
    value: string;
    readOnly?: boolean;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => (
    <textarea
      data-testid={`textarea-${name}`}
      value={value}
      readOnly={readOnly}
      onChange={onChange}
    />
  ),
}));

vi.mock('@/utils/optimizedCategoryDetailFetcher', () => ({
  createOptimizedUnitDetailFetcher: createOptimizedUnitDetailFetcherMock,
}));

const baseProps = () => ({
  isExpanded: true,
  onExpand: vi.fn(),
  formData: {
    barcode: '899100',
    quantity: 12,
    unit_id: 'unit-1',
    description: 'desc awal',
  },
  units: [
    { value: 'unit-1', label: 'Box' },
    { value: 'unit-2', label: 'Strip' },
  ],
  loading: false,
  disabled: false,
  onChange: vi.fn(),
  onDropdownChange: vi.fn(),
});

describe('ItemAdditionalInfoForm', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.useFakeTimers();
    hoverResultMock.mockReset();
    createOptimizedUnitDetailFetcherMock.mockReset();
    unitDetailFetcherMock.mockReset();

    unitDetailFetcherMock.mockResolvedValue({
      title: 'Satuan Detail',
      subtitle: 'unit-2',
    });
    createOptimizedUnitDetailFetcherMock.mockReturnValue(unitDetailFetcherMock);

    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue({ measureText: () => ({ width: 32 }) }) as never;
  });

  afterEach(() => {
    vi.useRealTimers();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('handles header expand interactions and keyboard trigger', () => {
    const props = baseProps();

    render(<ItemAdditionalInfoForm {...props} isExpanded={false} />);

    const headerButton = screen.getByRole('button', { name: 'Info Tambahan' });
    fireEvent.click(headerButton);
    fireEvent.keyDown(headerButton, { key: 'Enter' });
    fireEvent.keyDown(headerButton, { key: ' ' });

    expect(props.onExpand).toHaveBeenCalledTimes(3);
    expect(headerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates unit selection, focuses quantity, and fetches hover detail', async () => {
    const props = baseProps();
    const { getByTestId } = render(<ItemAdditionalInfoForm {...props} />);

    expect(createOptimizedUnitDetailFetcherMock).toHaveBeenCalledWith(
      props.units
    );
    expect(screen.getByTestId('input-barcode')).toHaveValue('899100');
    expect(screen.getByTestId('input-quantity')).toHaveValue(12);

    fireEvent.focus(getByTestId('input-quantity'));
    expect(getByTestId('input-quantity')).toHaveAttribute(
      'data-validate',
      'true'
    );

    const quantityInput = getByTestId('input-quantity') as HTMLInputElement;
    const focusSpy = vi.spyOn(quantityInput, 'focus');

    fireEvent.click(screen.getByText('choose-unit'));
    expect(props.onDropdownChange).toHaveBeenCalledWith('unit_id', 'unit-2');
    expect(getByTestId('input-quantity')).toHaveAttribute(
      'data-validate',
      'false'
    );

    act(() => {
      vi.advanceTimersByTime(220);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('hover-unit'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(unitDetailFetcherMock).toHaveBeenCalledWith('unit-2');
    expect(hoverResultMock).toHaveBeenCalledWith({
      title: 'Satuan Detail',
      subtitle: 'unit-2',
    });
  });

  it('shows loading unit state and respects disabled mode', () => {
    const props = baseProps();
    const { rerender } = render(
      <ItemAdditionalInfoForm
        {...props}
        loading={true}
        units={[]}
        formData={{ ...props.formData, unit_id: '' }}
      />
    );

    expect(screen.getByDisplayValue('Memuat satuan...')).toBeDisabled();
    expect(screen.queryByTestId('input-quantity')).not.toBeInTheDocument();

    rerender(<ItemAdditionalInfoForm {...props} disabled={true} />);

    expect(screen.getByTestId('input-barcode')).toHaveAttribute('readonly');
    expect(screen.getByTestId('textarea-description')).toHaveAttribute(
      'readonly'
    );
    expect(screen.getByText('choose-unit').closest('button')).toBeDisabled();
  });
});
