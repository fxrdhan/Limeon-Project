import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDynamicGridHeight } from './useDynamicGridHeight';

const useTableHeightMock = vi.hoisted(() => vi.fn());

vi.mock('./useTableHeight', () => ({
  useTableHeight: useTableHeightMock,
}));

describe('useDynamicGridHeight', () => {
  beforeEach(() => {
    useTableHeightMock.mockReset();
    useTableHeightMock.mockReturnValue('680px');
  });

  it('calculates grid height using data length, page size, and viewport', () => {
    const data = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));

    const { result } = renderHook(() =>
      useDynamicGridHeight({
        data,
        currentPageSize: 10,
      })
    );

    expect(useTableHeightMock).toHaveBeenCalledWith(320);
    expect(result.current.viewportHeight).toBe('680px');
    expect(result.current.gridHeight).toBe(428);
  });

  it('supports unlimited page size and enforces minimum rows', () => {
    useTableHeightMock.mockReturnValue('300px');

    const data = Array.from({ length: 2 }, (_, index) => ({ id: index + 1 }));

    const { result } = renderHook(() =>
      useDynamicGridHeight({
        data,
        currentPageSize: -1,
        baseHeight: 108,
        rowHeight: 32,
        minRows: 5,
      })
    );

    // available rows by viewport: floor((300 - 108) / 32) = 6
    // displayed rows: min(dataLength=2, effectivePageSize=2) = 2
    // actual rows: max(minRows=5, min(2, 2)) = 5
    expect(result.current.gridHeight).toBe(268);
  });
});
