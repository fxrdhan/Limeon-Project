import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryKeys } from '@/constants/queryKeys';
import { useAddItemMutations } from './useItemMutations';

const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const refetchQueriesMock = vi.hoisted(() => vi.fn());

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

const itemDeleteMock = vi.hoisted(() => vi.fn());
const saveItemBusinessLogicMock = vi.hoisted(() => vi.fn());

const categoryCreateMock = vi.hoisted(() => vi.fn());
const typeCreateMock = vi.hoisted(() => vi.fn());
const packageCreateMock = vi.hoisted(() => vi.fn());
const dosageCreateMock = vi.hoisted(() => vi.fn());
const manufacturerCreateMock = vi.hoisted(() => vi.fn());

const saveCategoryMock = vi.hoisted(() => vi.fn());
const saveTypeMock = vi.hoisted(() => vi.fn());
const saveUnitMock = vi.hoisted(() => vi.fn());
const saveDosageMock = vi.hoisted(() => vi.fn());
const saveManufacturerMock = vi.hoisted(() => vi.fn());
const prepareItemDataMock = vi.hoisted(() => vi.fn());
const generateItemCodeMock = vi.hoisted(() => vi.fn());
const checkExistingCodesMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/services/api/items.service', () => ({
  itemsService: {
    delete: itemDeleteMock,
  },
}));

vi.mock('./GenericHookFactories', () => ({
  useEntityMutations: {
    categories: { useCreate: categoryCreateMock },
    types: { useCreate: typeCreateMock },
    packages: { useCreate: packageCreateMock },
    units: { useCreate: vi.fn() },
    dosages: { useCreate: dosageCreateMock },
    manufacturers: { useCreate: manufacturerCreateMock },
  },
}));

vi.mock('./ItemMutationUtilities', () => ({
  saveItemBusinessLogic: saveItemBusinessLogicMock,
  saveEntityHelpers: {
    saveCategory: saveCategoryMock,
    saveType: saveTypeMock,
    saveUnit: saveUnitMock,
    saveDosage: saveDosageMock,
    saveManufacturer: saveManufacturerMock,
  },
  prepareItemData: prepareItemDataMock,
  generateItemCode: generateItemCodeMock,
  checkExistingCodes: checkExistingCodesMock,
}));

describe('useAddItemMutations', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    refetchQueriesMock.mockReset();

    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    itemDeleteMock.mockReset();
    saveItemBusinessLogicMock.mockReset();

    categoryCreateMock.mockReset();
    typeCreateMock.mockReset();
    packageCreateMock.mockReset();
    dosageCreateMock.mockReset();
    manufacturerCreateMock.mockReset();

    saveCategoryMock.mockReset();
    saveTypeMock.mockReset();
    saveUnitMock.mockReset();
    saveDosageMock.mockReset();
    saveManufacturerMock.mockReset();
    prepareItemDataMock.mockReset();
    generateItemCodeMock.mockReset();
    checkExistingCodesMock.mockReset();

    categoryCreateMock.mockReturnValue({ mutateAsync: vi.fn() });
    typeCreateMock.mockReturnValue({ mutateAsync: vi.fn() });
    packageCreateMock.mockReturnValue({ mutateAsync: vi.fn() });
    dosageCreateMock.mockReturnValue({ mutateAsync: vi.fn() });
    manufacturerCreateMock.mockReturnValue({ mutateAsync: vi.fn() });

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      refetchQueries: refetchQueriesMock,
    });

    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (arg: unknown) => Promise<unknown>;
        onSuccess?: (...args: unknown[]) => void;
        onError?: (...args: unknown[]) => void;
      }) => ({
        mutateAsync: async (arg: unknown) => {
          try {
            const result = await config.mutationFn(arg);
            config.onSuccess?.(result, arg, undefined);
            return result;
          } catch (error) {
            config.onError?.(error as Error, arg, undefined);
            throw error;
          }
        },
        isPending: false,
      })
    );
  });

  it('wires entity create mutations with expected query invalidations', () => {
    renderHook(() => useAddItemMutations({ onClose: vi.fn() }));

    expect(categoryCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );

    const categoryOptions = categoryCreateMock.mock.calls[0][0] as {
      onSuccess: () => void;
      onError: (error: Error) => void;
    };

    categoryOptions.onSuccess();
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.masterData.categories.all,
    });

    categoryOptions.onError(new Error('x'));

    const typeOptions = typeCreateMock.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    const unitOptions = packageCreateMock.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    const dosageOptions = dosageCreateMock.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    const manufacturerOptions = manufacturerCreateMock.mock.calls[0][0] as {
      onSuccess: () => void;
    };

    typeOptions.onSuccess();
    unitOptions.onSuccess();
    dosageOptions.onSuccess();
    manufacturerOptions.onSuccess();

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.masterData.types.all,
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.masterData.packages.all,
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.masterData.dosages.all,
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.masterData.manufacturers.all,
    });
  });

  it('handles delete mutation success and failure paths', async () => {
    const onClose = vi.fn();

    itemDeleteMock.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAddItemMutations({ onClose }));

    await act(async () => {
      await result.current.deleteItemMutation.mutateAsync('item-1');
    });

    expect(itemDeleteMock).toHaveBeenCalledWith('item-1');
    expect(toastSuccessMock).toHaveBeenCalledWith('Item berhasil dihapus');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.items.all,
    });
    expect(onClose).toHaveBeenCalled();

    const deleteError = new Error('delete failed');
    itemDeleteMock.mockResolvedValueOnce({ error: deleteError });

    await expect(
      result.current.deleteItemMutation.mutateAsync('item-2')
    ).rejects.toBe(deleteError);

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menghapus item. Silakan coba lagi.'
    );
  });

  it('handles save mutation success and exposes utility/helper references', async () => {
    const onClose = vi.fn();
    const refetchItems = vi.fn();

    saveItemBusinessLogicMock.mockResolvedValueOnce({
      action: 'create',
      code: 'ITM-001',
    });

    const { result } = renderHook(() =>
      useAddItemMutations({ onClose, refetchItems })
    );

    await act(async () => {
      await result.current.saveItemMutation.mutateAsync({
        formData: { name: 'x' },
        conversions: [],
        baseUnit: 'PCS',
        isEditMode: false,
      });
    });

    expect(saveItemBusinessLogicMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith('Item berhasil ditambahkan');
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.items.all,
      refetchType: 'all',
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(refetchQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.items.all,
      type: 'all',
    });
    expect(refetchItems).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    expect(result.current.saveCategory).toBe(saveCategoryMock);
    expect(result.current.saveType).toBe(saveTypeMock);
    expect(result.current.saveUnit).toBe(saveUnitMock);
    expect(result.current.saveDosage).toBe(saveDosageMock);
    expect(result.current.saveManufacturer).toBe(saveManufacturerMock);
    expect(result.current.prepareItemData).toBe(prepareItemDataMock);
    expect(result.current.generateItemCode).toBe(generateItemCodeMock);
    expect(result.current.checkExistingCodes).toBe(checkExistingCodesMock);
  });

  it('handles save mutation failure with error toast', async () => {
    saveItemBusinessLogicMock.mockRejectedValueOnce(new Error('save failed'));

    const { result } = renderHook(() =>
      useAddItemMutations({ onClose: vi.fn() })
    );

    await expect(
      result.current.saveItemMutation.mutateAsync({
        formData: { name: 'x' },
        conversions: [],
        baseUnit: 'PCS',
        isEditMode: true,
        itemId: 'item-1',
      })
    ).rejects.toBeInstanceOf(Error);

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menyimpan data item. Silakan coba lagi.'
    );
  });
});
