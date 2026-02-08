import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemFormHandlers } from './useItemFormHandlers';

const extractNumericValueMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/formatters', () => ({
  extractNumericValue: extractNumericValueMock,
}));

describe('useItemFormHandlers', () => {
  beforeEach(() => {
    extractNumericValueMock.mockReset();
    extractNumericValueMock.mockImplementation((value: string) =>
      Number(value.replace(/[^0-9]/g, ''))
    );
  });

  it('forwards form change and syncs base/sell price to package conversion hook', () => {
    const handleChange = vi.fn();
    const handleSelectChange = vi.fn();
    const setBasePrice = vi.fn();
    const setSellPrice = vi.fn();

    const { result } = renderHook(() =>
      useItemFormHandlers({
        formState: {
          handleChange,
          handleSelectChange,
          formData: {
            name: 'Paracetamol',
          } as never,
        },
        packageConversionHook: {
          setBasePrice,
          setSellPrice,
        },
      })
    );

    act(() => {
      result.current.handleChange({
        target: {
          name: 'base_price',
          value: 'Rp 12.500',
        },
      } as React.ChangeEvent<HTMLInputElement>);

      result.current.handleChange({
        target: {
          name: 'sell_price',
          value: 'Rp 15.000',
        },
      } as React.ChangeEvent<HTMLInputElement>);

      result.current.handleChange({
        target: {
          name: 'name',
          value: 'Paracetamol Forte',
        },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(extractNumericValueMock).toHaveBeenNthCalledWith(1, 'Rp 12.500');
    expect(extractNumericValueMock).toHaveBeenNthCalledWith(2, 'Rp 15.000');
    expect(setBasePrice).toHaveBeenCalledWith(12500);
    expect(setSellPrice).toHaveBeenCalledWith(15000);
  });

  it('forwards select changes to formState handler', () => {
    const handleSelectChange = vi.fn();

    const { result } = renderHook(() =>
      useItemFormHandlers({
        formState: {
          handleChange: vi.fn(),
          handleSelectChange,
          formData: {} as never,
        },
        packageConversionHook: {
          setBasePrice: vi.fn(),
          setSellPrice: vi.fn(),
        },
      })
    );

    const event = {
      target: { name: 'category_id', value: 'cat-1' },
    } as React.ChangeEvent<HTMLSelectElement>;

    act(() => {
      result.current.handleSelectChange(event);
    });

    expect(handleSelectChange).toHaveBeenCalledWith(event);
  });
});
