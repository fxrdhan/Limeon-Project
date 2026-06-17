import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useItemData } from './useItemData';
import type { ItemDataRecord } from '../../../infrastructure/itemData.service';

const {
  fetchItemDataByIdMock,
  loggerDebugMock,
  loggerErrorMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  fetchItemDataByIdMock: vi.fn(),
  loggerDebugMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../../infrastructure/itemData.service', () => ({
  itemDataService: {
    fetchItemDataById: fetchItemDataByIdMock,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: loggerDebugMock,
    error: loggerErrorMock,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

type ItemDataResponse = {
  data: ItemDataRecord | null;
  error: Error | null;
};

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

const createFormState = () => ({
  setLoading: vi.fn(),
  setFormData: vi.fn(),
  setInitialFormData: vi.fn(),
  setInitialPackageConversions: vi.fn(),
  setDisplayBasePrice: vi.fn(),
  setDisplaySellPrice: vi.fn(),
});

const createPackageConversionHook = () => ({
  setBaseUnit: vi.fn(),
  setBaseInventoryUnitId: vi.fn(),
  setBaseUnitKind: vi.fn(),
  setBasePrice: vi.fn(),
  setSellPrice: vi.fn(),
  skipNextRecalculation: vi.fn(),
  setConversions: vi.fn(),
});

const createItemRecord = (id: string, name: string): ItemDataRecord => ({
  id,
  code: id.toUpperCase(),
  name,
  base_inventory_unit_id: `${id}-unit`,
  base_inventory_unit: {
    id: `${id}-unit`,
    code: `${id}-unit`,
    name: 'Box',
    kind: 'packaging',
  },
  base_price: 10_000,
  sell_price: 12_000,
});

describe('useItemData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores stale item detail results after a newer fetch starts', async () => {
    const olderFetch = createDeferred<ItemDataResponse>();
    const newerFetch = createDeferred<ItemDataResponse>();
    fetchItemDataByIdMock
      .mockReturnValueOnce(olderFetch.promise)
      .mockReturnValueOnce(newerFetch.promise);
    const formState = createFormState();

    const { result } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook: createPackageConversionHook(),
      })
    );

    let olderFetchPromise: Promise<void>;
    act(() => {
      olderFetchPromise = result.current.fetchItemData('old-item');
    });

    let newerFetchPromise: Promise<void>;
    act(() => {
      newerFetchPromise = result.current.fetchItemData('new-item');
    });

    await act(async () => {
      olderFetch.resolve({
        data: createItemRecord('old-item', 'Old Item'),
        error: null,
      });
      await olderFetchPromise;
    });

    expect(formState.setFormData).not.toHaveBeenCalled();
    expect(formState.setLoading).toHaveBeenCalledTimes(2);
    expect(formState.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(formState.setLoading).toHaveBeenNthCalledWith(2, true);

    await act(async () => {
      newerFetch.resolve({
        data: createItemRecord('new-item', 'New Item'),
        error: null,
      });
      await newerFetchPromise;
    });

    expect(formState.setFormData).toHaveBeenCalledOnce();
    expect(formState.setFormData).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'NEW-ITEM',
        name: 'New Item',
      })
    );
    expect(formState.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('does not hydrate or clear loading after unmount', async () => {
    const pendingFetch = createDeferred<ItemDataResponse>();
    fetchItemDataByIdMock.mockReturnValueOnce(pendingFetch.promise);
    const formState = createFormState();

    const { result, unmount } = renderHook(() =>
      useItemData({
        formState,
        packageConversionHook: createPackageConversionHook(),
      })
    );

    let fetchPromise: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchItemData('item-a');
    });

    unmount();

    await act(async () => {
      pendingFetch.resolve({
        data: createItemRecord('item-a', 'Item A'),
        error: null,
      });
      await fetchPromise;
    });

    expect(formState.setFormData).not.toHaveBeenCalled();
    expect(formState.setLoading).toHaveBeenCalledOnce();
    expect(formState.setLoading).toHaveBeenCalledWith(true);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
