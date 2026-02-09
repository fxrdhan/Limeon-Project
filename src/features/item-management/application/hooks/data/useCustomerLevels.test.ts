import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerLevels } from './useCustomerLevels';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

const customerLevelsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  seedDefaults: vi.fn(),
}));

const unsubscribeMock = vi.hoisted(() => vi.fn());
const onChannelMock = vi.hoisted(() => vi.fn());
const subscribeChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/services/api/customerLevels.service', () => ({
  customerLevelsService: customerLevelsServiceMock,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

describe('useCustomerLevels', () => {
  const mutationConfigs: Array<Record<string, unknown>> = [];
  const mutationInstances: Array<{
    mutate: ReturnType<typeof vi.fn>;
    mutateAsync: (payload?: unknown) => Promise<unknown>;
  }> = [];

  let realtimePayloadHandler: (() => void) | undefined;

  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    Object.values(customerLevelsServiceMock).forEach(fn => fn.mockReset());

    onChannelMock.mockReset();
    subscribeChannelMock.mockReset();
    unsubscribeMock.mockReset();
    removeChannelMock.mockReset();
    createChannelMock.mockReset();

    mutationConfigs.length = 0;
    mutationInstances.length = 0;
    realtimePayloadHandler = undefined;

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: { queryFn: () => Promise<unknown> }) => ({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        queryFn: config.queryFn,
      })
    );

    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (payload?: unknown) => Promise<unknown>;
        onSuccess?: (...args: unknown[]) => void;
        onError?: (...args: unknown[]) => void;
      }) => {
        mutationConfigs.push(config);

        const mutate = vi.fn((payload?: unknown) => {
          void config
            .mutationFn(payload)
            .then(result => {
              config.onSuccess?.(result, payload, undefined);
            })
            .catch(error => {
              config.onError?.(error, payload, undefined);
            });
        });

        const mutateAsync = async (payload?: unknown) => {
          try {
            const result = await config.mutationFn(payload);
            config.onSuccess?.(result, payload, undefined);
            return result;
          } catch (error) {
            config.onError?.(error, payload, undefined);
            throw error;
          }
        };

        const instance = { mutate, mutateAsync };
        mutationInstances.push(instance);
        return instance;
      }
    );

    const channel = {
      on: onChannelMock,
      subscribe: subscribeChannelMock,
      unsubscribe: unsubscribeMock,
    };

    onChannelMock.mockImplementation(
      (
        _event: unknown,
        _filters: unknown,
        callback: () => void
      ): typeof channel => {
        realtimePayloadHandler = callback;
        return channel;
      }
    );
    subscribeChannelMock.mockImplementation(() => channel);
    createChannelMock.mockImplementation(() => channel);
  });

  it('normalizes fetched levels and seeds defaults for empty data', async () => {
    customerLevelsServiceMock.getAll.mockResolvedValueOnce({
      data: [
        {
          id: 'lvl-1',
          level_name: 'Level 1',
          price_percentage: '95',
        },
      ],
      error: null,
    });
    customerLevelsServiceMock.seedDefaults.mockResolvedValue({ error: null });

    const { unmount } = renderHook(() => useCustomerLevels());

    expect(mutationInstances).toHaveLength(4);
    expect(mutationInstances[3].mutate).toHaveBeenCalledTimes(1);

    const queryConfig = useQueryMock.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };
    await expect(queryConfig.queryFn()).resolves.toEqual([
      {
        id: 'lvl-1',
        level_name: 'Level 1',
        price_percentage: 95,
      },
    ]);

    act(() => {
      realtimePayloadHandler?.();
    });

    expect(createChannelMock).toHaveBeenCalledWith('customer-levels-realtime');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['customer-levels'],
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('creates, updates, and deletes levels with success/error handling', async () => {
    customerLevelsServiceMock.create.mockResolvedValue({
      data: { id: 'new-level' },
      error: null,
    });
    customerLevelsServiceMock.update
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('update failed') });
    customerLevelsServiceMock.delete
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('delete failed') });

    const { result } = renderHook(() => useCustomerLevels());

    await act(async () => {
      await result.current.createLevel.mutateAsync({
        level_name: 'Level X',
        price_percentage: 88,
      });
    });

    expect(customerLevelsServiceMock.create).toHaveBeenCalledWith({
      level_name: 'Level X',
      price_percentage: 88,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Level pelanggan berhasil ditambahkan'
    );

    await act(async () => {
      await result.current.updateLevels.mutateAsync([]);
    });

    await act(async () => {
      await result.current.updateLevels.mutateAsync([
        { id: 'lvl-1', price_percentage: 90 },
        { id: 'lvl-2', price_percentage: 85, level_name: 'Custom 2' },
      ]);
    });

    expect(customerLevelsServiceMock.update).toHaveBeenCalledWith('lvl-1', {
      price_percentage: 90,
    });
    expect(customerLevelsServiceMock.update).toHaveBeenCalledWith('lvl-2', {
      price_percentage: 85,
      level_name: 'Custom 2',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Baseline level berhasil diperbarui'
    );

    await act(async () => {
      await result.current.deleteLevel.mutateAsync({
        id: 'lvl-1',
        levels: [
          { id: 'lvl-1', level_name: 'Level 1' },
          { id: 'lvl-2', level_name: 'Tier Lama' },
        ],
      });
    });

    expect(customerLevelsServiceMock.delete).toHaveBeenCalledWith('lvl-1');
    expect(customerLevelsServiceMock.update).toHaveBeenCalledWith('lvl-2', {
      level_name: 'Level 1',
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Level pelanggan berhasil dihapus'
    );

    await act(async () => {
      await result.current.deleteLevel.mutateAsync({
        id: 'lvl-2',
        levels: [{ id: 'lvl-2', level_name: 'Level 1' }],
      });
    });

    await expect(
      result.current.deleteLevel.mutateAsync({
        id: 'lvl-9',
        levels: [{ id: 'lvl-9', level_name: 'Level 1' }],
      })
    ).rejects.toBeInstanceOf(Error);
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menghapus level pelanggan.'
    );

    await expect(
      result.current.updateLevels.mutateAsync([
        { id: 'lvl-10', price_percentage: 70 },
      ])
    ).rejects.toBeInstanceOf(Error);
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal memperbarui baseline level.'
    );
  });

  it('handles query/create/seed errors and skips seed in non-empty states', async () => {
    useQueryMock.mockImplementationOnce(
      (config: { queryFn: () => Promise<unknown> }) => ({
        data: [{ id: 'lvl-1' }],
        isLoading: false,
        isError: false,
        error: null,
        queryFn: config.queryFn,
      })
    );

    customerLevelsServiceMock.getAll.mockResolvedValue({
      data: null,
      error: new Error('query failed'),
    });
    customerLevelsServiceMock.create.mockResolvedValue({
      data: null,
      error: new Error('create failed'),
    });
    customerLevelsServiceMock.seedDefaults.mockResolvedValue({
      error: new Error('seed failed'),
    });

    const { result } = renderHook(() => useCustomerLevels());

    expect(mutationInstances[3].mutate).not.toHaveBeenCalled();

    const queryConfig = useQueryMock.mock.calls[0][0] as {
      queryFn: () => Promise<unknown>;
    };
    await expect(queryConfig.queryFn()).rejects.toBeInstanceOf(Error);

    await expect(
      result.current.createLevel.mutateAsync({
        level_name: 'x',
        price_percentage: 1,
      })
    ).rejects.toBeInstanceOf(Error);

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menambahkan level pelanggan.'
    );
  });
});
