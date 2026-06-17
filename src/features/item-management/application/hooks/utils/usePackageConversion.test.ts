import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ItemInventoryUnit } from '../../../../../types/database';
import { usePackageConversion } from './usePackageConversion';

const { getActiveInventoryUnitsMock } = vi.hoisted(() => ({
  getActiveInventoryUnitsMock: vi.fn(),
}));

vi.mock('../../../infrastructure/itemMasterData.service', () => ({
  itemMasterDataService: {
    getActiveInventoryUnits: getActiveInventoryUnitsMock,
  },
}));

const createDeferred = <T>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const createInventoryUnit = (id: string, name: string): ItemInventoryUnit => ({
  id,
  code: id.toUpperCase(),
  name,
  kind: 'packaging',
});

describe('usePackageConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps newer inventory units when an older refresh resolves later', async () => {
    const olderRefresh = createDeferred<{
      data: ItemInventoryUnit[];
    }>();
    const newerRefresh = createDeferred<{
      data: ItemInventoryUnit[];
    }>();
    getActiveInventoryUnitsMock
      .mockReturnValueOnce(olderRefresh.promise)
      .mockReturnValueOnce(newerRefresh.promise);

    const { result } = renderHook(() => usePackageConversion());

    let newerRefreshPromise: Promise<void> = Promise.resolve();
    act(() => {
      newerRefreshPromise = result.current.refreshAvailableUnits();
    });

    await act(async () => {
      newerRefresh.resolve({
        data: [createInventoryUnit('unit-b', 'Unit B')],
      });
      await newerRefreshPromise;
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.availableUnits.map(unit => unit.id)).toEqual([
        'unit-b',
      ]);
    });

    await act(async () => {
      olderRefresh.resolve({
        data: [createInventoryUnit('unit-a', 'Unit A')],
      });
      await olderRefresh.promise;
      await Promise.resolve();
    });

    expect(result.current.availableUnits.map(unit => unit.id)).toEqual([
      'unit-b',
    ]);
  });
});
