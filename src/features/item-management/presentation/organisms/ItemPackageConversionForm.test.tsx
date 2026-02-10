import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemPackageConversionForm from './ItemPackageConversionForm';

const createTextColumnMock = vi.hoisted(() => vi.fn());
const createCurrencyColumnMock = vi.hoisted(() => vi.fn());
const capturedGridProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const capturedPackageInputProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const gridRefApi = vi.hoisted(() => ({
  autoSizeAllColumns: vi.fn(),
  isDestroyed: vi.fn(() => false),
}));

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

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('../atoms', () => ({
  PackageConversionInput: (props: Record<string, unknown>) => {
    capturedPackageInputProps.current = props;

    return (
      <div data-testid="package-conversion-input">
        <button
          type="button"
          onClick={() =>
            (
              props.onFormDataChange as (data: {
                unit: string;
                conversion_rate: number;
              }) => void
            )?.({
              unit: 'Bottle',
              conversion_rate: 12,
            })
          }
        >
          update-form-data
        </button>
        <button
          type="button"
          onClick={() => (props.onAddConversion as () => void)?.()}
        >
          add-conversion
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ag-grid', async () => {
  const react = await vi.importActual<typeof import('react')>('react');

  return {
    DataGrid: react.forwardRef<
      { api: typeof gridRefApi },
      Record<string, unknown>
    >((props, ref) => {
      capturedGridProps.current = props;
      react.useImperativeHandle(ref, () => ({ api: gridRefApi }));

      return react.createElement('div', { 'data-testid': 'package-grid' });
    }),
    createTextColumn: createTextColumnMock,
    createCurrencyColumn: createCurrencyColumnMock,
  };
});

const baseProps = () => ({
  isExpanded: true,
  onExpand: vi.fn(),
  baseUnit: 'Tablet',
  availableUnits: [
    { id: 'u-tablet', name: 'Tablet' },
    { id: 'u-strip', name: 'Strip' },
    { id: 'u-box', name: 'Box' },
    { id: 'u-bottle', name: 'Bottle' },
  ],
  conversions: [
    {
      id: 'c-1',
      unit_name: 'Strip',
      conversion_rate: 10,
      base_price: 1000,
      sell_price: 2000,
      to_unit_id: 'u-strip',
      unit: { id: 'u-strip', name: 'Strip' },
    },
    {
      id: 'c-2',
      unit_name: 'Strip duplicate',
      conversion_rate: 5,
      base_price: 1200,
      sell_price: 2100,
      to_unit_id: 'u-strip',
      unit: { id: 'u-strip', name: 'Strip' },
    },
    {
      id: 'c-3',
      unit_name: 'Box',
      conversion_rate: 20,
      base_price: 1500,
      sell_price: 2500,
      to_unit_id: 'u-box',
      unit: { id: 'u-box', name: 'Box' },
    },
  ],
  formData: {
    unit: '',
    conversion_rate: 0,
  },
  onFormDataChange: vi.fn(),
  onAddConversion: vi.fn(),
  onRemoveConversion: vi.fn(),
  onUpdateSellPrice: vi.fn(),
  onInteractionStart: vi.fn(),
  onInteractionEnd: vi.fn(),
  disabled: false,
});

describe('ItemPackageConversionForm', () => {
  beforeEach(() => {
    capturedGridProps.current = null;
    capturedPackageInputProps.current = null;

    createTextColumnMock.mockReset();
    createCurrencyColumnMock.mockReset();
    gridRefApi.autoSizeAllColumns.mockReset();
    gridRefApi.isDestroyed.mockReset();
    gridRefApi.isDestroyed.mockReturnValue(false);

    createTextColumnMock.mockImplementation(
      (config: Record<string, unknown>) => config
    );
    createCurrencyColumnMock.mockImplementation(
      (config: Record<string, unknown>) => config
    );
  });

  it('filters units/conversions, wires handlers, and parses edited sell price values', () => {
    const props = baseProps();
    render(<ItemPackageConversionForm {...props} />);

    expect(screen.getByTestId('package-conversion-input')).toBeInTheDocument();
    expect(screen.getByTestId('package-grid')).toBeInTheDocument();

    expect(capturedPackageInputProps.current).toBeTruthy();
    const packageInputProps = capturedPackageInputProps.current as {
      availableUnits: Array<{ id: string }>;
    };
    expect(packageInputProps.availableUnits.map(unit => unit.id)).toEqual([
      'u-bottle',
    ]);

    const gridProps = capturedGridProps.current as {
      rowData: Array<{ id: string; unit: { name: string } }>;
      onCellValueChanged: (event: {
        colDef: { field?: string };
        data?: { id: string };
        newValue?: unknown;
      }) => void;
      onCellEditingStarted: () => void;
      onCellEditingStopped: () => void;
      onFirstDataRendered: (event: {
        api: {
          isDestroyed: () => boolean;
          applyColumnState: (value: unknown) => void;
          getColumnState: () => unknown[];
          autoSizeAllColumns: () => void;
        };
      }) => void;
      onColumnMenuVisibleChanged: (event: { visible?: boolean }) => void;
      onContextMenuVisibleChanged: (event: { visible?: boolean }) => void;
    };

    expect(gridProps.rowData.map(row => row.id)).toEqual(['c-1', 'c-3']);
    expect(gridRefApi.autoSizeAllColumns).toHaveBeenCalled();

    const firstDataApi = {
      isDestroyed: vi.fn(() => false),
      applyColumnState: vi.fn(),
      getColumnState: vi.fn(() => [{ colId: 'unit.name' }]),
      autoSizeAllColumns: vi.fn(),
    };

    gridProps.onFirstDataRendered({ api: firstDataApi });
    gridProps.onFirstDataRendered({ api: firstDataApi });

    expect(firstDataApi.getColumnState).toHaveBeenCalledTimes(1);
    expect(firstDataApi.applyColumnState).toHaveBeenCalledWith({
      state: [{ colId: 'unit.name' }],
      applyOrder: true,
    });
    expect(firstDataApi.autoSizeAllColumns).toHaveBeenCalledTimes(2);

    gridProps.onCellEditingStarted();
    gridProps.onCellEditingStopped();
    expect(props.onInteractionStart).toHaveBeenCalledTimes(1);
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(1);

    gridProps.onCellValueChanged({
      colDef: { field: 'sell_price' },
      data: { id: 'c-1' },
      newValue: 'Rp 12.500',
    });
    gridProps.onCellValueChanged({
      colDef: { field: 'sell_price' },
      data: { id: 'c-3' },
      newValue: -500,
    });
    gridProps.onCellValueChanged({
      colDef: { field: 'sell_price' },
      data: { id: 'c-3' },
      newValue: 'abc',
    });
    gridProps.onCellValueChanged({
      colDef: { field: 'base_price' },
      data: { id: 'c-3' },
      newValue: 999,
    });
    gridProps.onCellValueChanged({
      colDef: { field: 'sell_price' },
      data: { id: 'c-3' },
      newValue: { invalid: true },
    });

    expect(props.onUpdateSellPrice).toHaveBeenNthCalledWith(1, 'c-1', 12500);
    expect(props.onUpdateSellPrice).toHaveBeenNthCalledWith(2, 'c-3', 0);
    expect(props.onUpdateSellPrice).toHaveBeenNthCalledWith(3, 'c-3', 0);
    expect(props.onUpdateSellPrice).toHaveBeenNthCalledWith(4, 'c-3', 0);

    fireEvent.click(screen.getByText('update-form-data'));
    fireEvent.click(screen.getByText('add-conversion'));
    expect(props.onFormDataChange).toHaveBeenCalledWith({
      unit: 'Bottle',
      conversion_rate: 12,
    });
    expect(props.onAddConversion).toHaveBeenCalledTimes(1);

    const section = screen
      .getByRole('button', { name: 'Konversi Kemasan' })
      .closest('section') as HTMLElement;
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focus(section);
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onInteractionStart).toHaveBeenCalledTimes(2);
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(2);

    gridProps.onColumnMenuVisibleChanged({ visible: true });
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(2);

    gridProps.onColumnMenuVisibleChanged({ visible: false });
    gridProps.onContextMenuVisibleChanged({ visible: true });
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(2);

    const insideTarget = document.createElement('button');
    section.appendChild(insideTarget);
    fireEvent.blur(section, { relatedTarget: insideTarget });
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(2);

    const popup = document.createElement('div');
    popup.className = 'ag-popup';
    document.body.appendChild(popup);
    gridProps.onContextMenuVisibleChanged({ visible: false });
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onInteractionEnd).toHaveBeenCalledTimes(2);

    document.body.removeChild(popup);
    document.body.removeChild(outside);
  });

  it('handles header interactions and focus-first behavior when collapsed', () => {
    const props = baseProps();
    render(<ItemPackageConversionForm {...props} isExpanded={false} />);

    const header = screen.getByRole('button', { name: 'Konversi Kemasan' });

    fireEvent.click(header);
    fireEvent.keyDown(header, { key: 'Enter' });
    fireEvent.keyDown(header, { key: ' ' });

    expect(props.onExpand).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByTestId('package-conversion-input')
    ).not.toBeInTheDocument();
  });

  it('focuses first field after expand shortcut when content becomes available', () => {
    vi.useFakeTimers();
    const props = baseProps();
    const { rerender } = render(
      <ItemPackageConversionForm {...props} isExpanded={false} />
    );

    const header = screen.getByRole('button', { name: 'Konversi Kemasan' });
    const matchesSpy = vi
      .spyOn(header, 'matches')
      .mockImplementation(selector => selector === ':focus-visible');

    fireEvent.focus(header);
    expect(props.onExpand).toHaveBeenCalledTimes(1);

    rerender(<ItemPackageConversionForm {...props} isExpanded={true} />);
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(props.onExpand).toHaveBeenCalledTimes(2);

    const gridProps = capturedGridProps.current as {
      getRowId: (params: { data?: { id?: string } }) => string | undefined;
      columnDefs: Array<{
        field?: string;
        cellRenderer?: (params: { data?: { id: string } }) => React.ReactNode;
      }>;
    };
    expect(gridProps.getRowId({ data: { id: 'c-1' } })).toBe('c-1');

    const actionColumn = gridProps.columnDefs.find(
      column => column.field === 'actions'
    );
    render(<>{actionColumn?.cellRenderer?.({ data: { id: 'c-1' } })}</>);
    fireEvent.click(screen.getAllByRole('button').at(-1)!);
    expect(props.onRemoveConversion).toHaveBeenCalledWith('c-1');

    fireEvent.keyDown(header, { key: ' ' });
    act(() => {
      vi.runAllTimers();
    });
    expect(document.activeElement?.textContent).toContain('update-form-data');

    matchesSpy.mockRestore();
    vi.useRealTimers();
  });

  it('disables interactions and editable column behavior when disabled', () => {
    const props = baseProps();
    const { rerender } = render(
      <ItemPackageConversionForm {...props} disabled={true} />
    );

    expect(capturedPackageInputProps.current).toBeTruthy();
    const packageInputProps = capturedPackageInputProps.current as {
      disabled: boolean;
    };
    expect(packageInputProps.disabled).toBe(true);

    const gridProps = capturedGridProps.current as {
      columnDefs: Array<{
        field?: string;
        editable?: boolean;
        valueParser?: (params: { newValue?: unknown }) => number;
        cellRenderer?: (params: { data?: { id: string } }) => React.ReactNode;
      }>;
      onCellEditingStarted: () => void;
      onCellEditingStopped: () => void;
    };

    const sellPriceColumn = gridProps.columnDefs.find(
      column => column.field === 'sell_price'
    );
    expect(sellPriceColumn?.editable).toBe(false);
    expect(sellPriceColumn?.valueParser?.({ newValue: 'Rp 8.999' })).toBe(8999);

    const actionColumn = gridProps.columnDefs.find(
      column => column.field === 'actions'
    );
    render(<>{actionColumn?.cellRenderer?.({ data: { id: 'c-1' } })}</>);
    expect(document.querySelector('button[disabled]')).toBeInTheDocument();

    gridProps.onCellEditingStarted();
    gridProps.onCellEditingStopped();
    expect(props.onInteractionStart).not.toHaveBeenCalled();
    expect(props.onInteractionEnd).not.toHaveBeenCalled();

    const section = screen
      .getByRole('button', { name: 'Konversi Kemasan' })
      .closest('section') as HTMLElement;
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focus(section);
    fireEvent.blur(section, { relatedTarget: outside });
    expect(props.onInteractionStart).not.toHaveBeenCalled();
    expect(props.onInteractionEnd).not.toHaveBeenCalled();

    rerender(
      <ItemPackageConversionForm
        {...props}
        disabled={true}
        conversions={[]}
        isExpanded={true}
      />
    );
    expect(screen.queryByTestId('package-grid')).not.toBeInTheDocument();

    document.body.removeChild(outside);
  });
});
