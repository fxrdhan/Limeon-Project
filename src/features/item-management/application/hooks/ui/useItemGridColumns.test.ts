import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemGridColumns } from './useItemGridColumns';

const createTextColumnMock = vi.hoisted(() => vi.fn());
const createWrapTextColumnMock = vi.hoisted(() => vi.fn());
const createCurrencyColumnMock = vi.hoisted(() => vi.fn());
const createCenterAlignColumnMock = vi.hoisted(() => vi.fn());
const formatCurrencyMock = vi.hoisted(() => vi.fn());
const formatBaseCurrencyMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ag-grid', () => ({
  createTextColumn: createTextColumnMock,
  createWrapTextColumn: createWrapTextColumnMock,
  createCurrencyColumn: createCurrencyColumnMock,
  createCenterAlignColumn: createCenterAlignColumnMock,
  formatCurrency: formatCurrencyMock,
  formatBaseCurrency: formatBaseCurrencyMock,
}));

describe('useItemGridColumns', () => {
  beforeEach(() => {
    createTextColumnMock.mockReset();
    createWrapTextColumnMock.mockReset();
    createCurrencyColumnMock.mockReset();
    createCenterAlignColumnMock.mockReset();
    formatCurrencyMock.mockReset();
    formatBaseCurrencyMock.mockReset();

    createTextColumnMock.mockImplementation(config => config);
    createWrapTextColumnMock.mockImplementation(config => config);
    createCurrencyColumnMock.mockImplementation(config => config);
    createCenterAlignColumnMock.mockImplementation(config => config);
    formatCurrencyMock.mockImplementation(value => `CUR-${value}`);
    formatBaseCurrencyMock.mockImplementation(value => `BASE-${value}`);
  });

  it('builds column definitions with expected behaviors and formatter wiring', () => {
    const { result } = renderHook(() => useItemGridColumns());

    expect(result.current.columnDefs).toHaveLength(12);

    const manufacturerColumn = result.current.columnDefs.find(
      column => column.field === 'manufacturer.name'
    );
    expect(manufacturerColumn?.enableRowGroup).toBe(true);
    expect(
      manufacturerColumn?.valueGetter?.({
        data: { manufacturer: { name: 'ABC' } },
      } as never)
    ).toBe('ABC');
    expect(manufacturerColumn?.valueGetter?.({ data: {} } as never)).toBe('-');

    const packageConversionColumn = result.current.columnDefs.find(
      column => column.field === 'package_conversions'
    );
    expect(
      packageConversionColumn?.valueGetter?.({
        data: {
          package_conversions: [
            { unit_name: 'Strip' },
            { unit_name: '' },
            { unit_name: 'Box' },
          ],
        },
      } as never)
    ).toBe('Strip, N/A, Box');
    expect(packageConversionColumn?.valueGetter?.({ data: {} } as never)).toBe(
      ''
    );
    expect(
      packageConversionColumn?.cellRenderer?.({ value: '' } as never)
    ).toBe('-');

    const basePriceColumn = result.current.columnDefs.find(
      column => column.field === 'base_price'
    );
    const sellPriceColumn = result.current.columnDefs.find(
      column => column.field === 'sell_price'
    );
    expect(basePriceColumn?.valueFormatter?.({ value: 1200 } as never)).toBe(
      'BASE-1200'
    );
    expect(sellPriceColumn?.valueFormatter?.({ value: 1500 } as never)).toBe(
      'CUR-1500'
    );

    expect(formatBaseCurrencyMock).toHaveBeenCalledWith(1200);
    expect(formatCurrencyMock).toHaveBeenCalledWith(1500);
  });

  it('returns expected auto-size column list and includes recently fixed IDs', () => {
    const { result } = renderHook(() => useItemGridColumns());

    expect(result.current.columnsToAutoSize).toEqual([
      'name',
      'code',
      'manufacturer.name',
      'barcode',
      'category.name',
      'type.name',
      'package.name',
      'dosage.name',
      'package_conversions',
      'base_price',
      'sell_price',
      'stock',
    ]);
  });
});
