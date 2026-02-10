import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRandomItemCreation } from './useRandomItemCreation';

const queryClientMock = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  refetchQueries: vi.fn(),
}));
const useEntityMock = vi.hoisted(() => vi.fn());
const validateEntitiesForGenerationMock = vi.hoisted(() => vi.fn());
const getEntitiesLoadingStatusMock = vi.hoisted(() => vi.fn());
const generateRandomItemDataMock = vi.hoisted(() => vi.fn());
const saveItemBusinessLogicMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastPromiseMock = vi.hoisted(() => vi.fn());
const getInvalidationKeysMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => queryClientMock,
}));

vi.mock('@/features/item-management/application/hooks/collections', () => ({
  useEntity: useEntityMock,
}));

vi.mock('./randomItemGenerator', () => ({
  validateEntitiesForGeneration: validateEntitiesForGenerationMock,
  getEntitiesLoadingStatus: getEntitiesLoadingStatusMock,
  generateRandomItemData: generateRandomItemDataMock,
}));

vi.mock(
  '@/features/item-management/application/hooks/core/ItemMutationUtilities',
  () => ({
    saveItemBusinessLogic: saveItemBusinessLogicMock,
  })
);

vi.mock('@/constants/queryKeys', () => ({
  getInvalidationKeys: {
    items: {
      all: getInvalidationKeysMock,
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    promise: toastPromiseMock,
  },
}));

const makeEntityData = (isLoading = false) => ({
  data: [{ id: 'id-1', name: 'Entity 1' }],
  isLoading,
});

describe('useRandomItemCreation', () => {
  beforeEach(() => {
    queryClientMock.invalidateQueries.mockReset();
    queryClientMock.refetchQueries.mockReset();
    useEntityMock.mockReset();
    validateEntitiesForGenerationMock.mockReset();
    getEntitiesLoadingStatusMock.mockReset();
    generateRandomItemDataMock.mockReset();
    saveItemBusinessLogicMock.mockReset();
    toastErrorMock.mockReset();
    toastPromiseMock.mockReset();
    getInvalidationKeysMock.mockReset();

    useEntityMock.mockImplementation(() => makeEntityData(false));
    validateEntitiesForGenerationMock.mockReturnValue(true);
    getEntitiesLoadingStatusMock.mockReturnValue(false);
    generateRandomItemDataMock.mockReturnValue({
      itemFormData: {
        name: 'Random Item',
      },
    });
    saveItemBusinessLogicMock.mockResolvedValue({ code: 'ITM-123' });
    getInvalidationKeysMock.mockReturnValue([['items'], ['dashboard']]);
    toastPromiseMock.mockImplementation(async promise => promise);
  });

  it('returns loading/ready state and passes enabled option to all entity hooks', () => {
    useEntityMock
      .mockReturnValueOnce(makeEntityData(true))
      .mockReturnValue(makeEntityData(false));
    getEntitiesLoadingStatusMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useRandomItemCreation({
        enabled: false,
      })
    );

    expect(result.current.isLoadingEntities).toBe(true);
    expect(result.current.entitiesReady).toBe(true);
    expect(useEntityMock).toHaveBeenCalledTimes(5);
    expect(useEntityMock).toHaveBeenNthCalledWith(1, {
      entityType: 'categories',
      enabled: false,
    });
    expect(useEntityMock).toHaveBeenNthCalledWith(2, {
      entityType: 'types',
      enabled: false,
    });
    expect(useEntityMock).toHaveBeenNthCalledWith(3, {
      entityType: 'packages',
      enabled: false,
    });
    expect(useEntityMock).toHaveBeenNthCalledWith(4, {
      entityType: 'dosages',
      enabled: false,
    });
    expect(useEntityMock).toHaveBeenNthCalledWith(5, {
      entityType: 'manufacturers',
      enabled: false,
    });
  });

  it('shows toast error and skips creation when entities are not ready', async () => {
    validateEntitiesForGenerationMock.mockReturnValue(false);

    const { result } = renderHook(() => useRandomItemCreation());

    await act(async () => {
      await result.current.createRandomItem();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Mohon tunggu sampai data master dimuat lengkap'
    );
    expect(generateRandomItemDataMock).not.toHaveBeenCalled();
    expect(saveItemBusinessLogicMock).not.toHaveBeenCalled();
    expect(toastPromiseMock).not.toHaveBeenCalled();
  });

  it('creates random item, calls business logic, and invalidates related queries', async () => {
    const { result } = renderHook(() => useRandomItemCreation());

    await act(async () => {
      await result.current.createRandomItem();
    });

    await waitFor(() => {
      expect(saveItemBusinessLogicMock).toHaveBeenCalledWith({
        formData: { name: 'Random Item' },
        conversions: [],
        baseUnit: '',
        isEditMode: false,
      });
    });

    expect(toastPromiseMock).toHaveBeenCalledTimes(1);

    const [creationPromise, toastMessages, toastStyles] =
      toastPromiseMock.mock.calls[0];

    expect(creationPromise).toBeInstanceOf(Promise);
    expect(toastMessages.loading).toBe('Membuat item acak...');
    expect(toastMessages.success({ code: 'OK-001' })).toBe(
      'Item berhasil dibuat dengan kode: OK-001'
    );
    expect(toastMessages.error({ message: 'bad request' })).toBe(
      'Gagal membuat item acak: bad request'
    );

    expect(toastStyles.style).toBeTruthy();
    expect(toastStyles.success.style).toBeTruthy();
    expect(toastStyles.error.style).toBeTruthy();

    expect(getInvalidationKeysMock).toHaveBeenCalledTimes(1);
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(queryClientMock.refetchQueries).toHaveBeenCalledTimes(2);
    expect(queryClientMock.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['items'],
    });
    expect(queryClientMock.refetchQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['dashboard'],
    });
  });

  it('maps missing entity data to empty arrays before validation', () => {
    useEntityMock
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: undefined, isLoading: false })
      .mockReturnValueOnce({ data: undefined, isLoading: false });

    renderHook(() => useRandomItemCreation());

    expect(validateEntitiesForGenerationMock).toHaveBeenCalledWith({
      categories: [],
      types: [],
      packages: [],
      dosages: [],
      manufacturers: [],
    });
  });
});
