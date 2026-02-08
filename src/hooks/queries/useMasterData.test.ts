import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAllMasterData,
  useCategories,
  useCategory,
  useCategoryMutations,
  useItemUnit,
  useItemUnitMutations,
  useItemUnits,
  useMedicineType,
  useMedicineTypeMutations,
  useMedicineTypes,
  usePackage,
  usePackageMutations,
  usePackages,
  useSearchSuppliers,
  useSupplier,
  useSupplierMutations,
  useSuppliers,
} from './useMasterData';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const refetchQueriesMock = vi.hoisted(() => vi.fn());

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

const preloadImageMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());

const masterDataServiceMock = vi.hoisted(() => ({
  categories: {
    getActiveCategories: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  types: {
    getActiveTypes: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  packages: {
    getActivePackages: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  itemUnits: {
    getActiveItemUnits: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  suppliers: {
    getActiveSuppliers: vi.fn(),
    getById: vi.fn(),
    searchSuppliers: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  getAllMasterData: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/masterData.service', () => ({
  masterDataService: masterDataServiceMock,
}));

vi.mock('@/utils/imageCache', () => ({
  preloadImage: preloadImageMock,
  setCachedImage: setCachedImageMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('useMasterData hooks', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    refetchQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    preloadImageMock.mockReset();
    setCachedImageMock.mockReset();

    Object.values(masterDataServiceMock).forEach(section => {
      if (typeof section === 'function') {
        section.mockReset();
        return;
      }

      Object.values(section).forEach(fn => {
        if (typeof fn === 'function') {
          fn.mockReset();
        }
      });
    });

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      refetchQueries: refetchQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
      }) => ({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        isPlaceholderData: false,
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        enabled: config.enabled,
      })
    );

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
            config.onError?.(error, arg, undefined);
            throw error;
          }
        },
      })
    );
  });

  it('runs query hooks and delegates fetchers/errors correctly', async () => {
    masterDataServiceMock.categories.getActiveCategories.mockResolvedValue({
      data: [{ id: 'cat-1' }],
      error: null,
    });
    masterDataServiceMock.categories.getById.mockResolvedValue({
      data: { id: 'cat-1' },
      error: null,
    });
    masterDataServiceMock.types.getActiveTypes.mockResolvedValue({
      data: [{ id: 'type-1' }],
      error: null,
    });
    masterDataServiceMock.types.getById.mockResolvedValue({
      data: { id: 'type-1' },
      error: null,
    });
    masterDataServiceMock.packages.getActivePackages.mockResolvedValue({
      data: [{ id: 'pkg-1' }],
      error: null,
    });
    masterDataServiceMock.packages.getById.mockResolvedValue({
      data: { id: 'pkg-1' },
      error: null,
    });
    masterDataServiceMock.itemUnits.getActiveItemUnits.mockResolvedValue({
      data: [{ id: 'unit-1' }],
      error: null,
    });
    masterDataServiceMock.itemUnits.getById.mockResolvedValue({
      data: { id: 'unit-1' },
      error: null,
    });
    masterDataServiceMock.suppliers.getById.mockResolvedValue({
      data: { id: 'sup-1' },
      error: null,
    });
    masterDataServiceMock.suppliers.searchSuppliers.mockResolvedValue({
      data: [{ id: 'sup-1' }],
      error: null,
    });
    masterDataServiceMock.getAllMasterData.mockResolvedValue({
      data: {},
      errors: {},
    });

    const { result: categoriesResult } = renderHook(() => useCategories());
    await expect(categoriesResult.current.queryFn()).resolves.toEqual([
      { id: 'cat-1' },
    ]);

    const { result: categoryResult } = renderHook(() => useCategory('cat-1'));
    await expect(categoryResult.current.queryFn()).resolves.toEqual({
      id: 'cat-1',
    });

    const { result: typesResult } = renderHook(() => useMedicineTypes());
    await expect(typesResult.current.queryFn()).resolves.toEqual([
      { id: 'type-1' },
    ]);

    const { result: typeResult } = renderHook(() => useMedicineType('type-1'));
    await expect(typeResult.current.queryFn()).resolves.toEqual({
      id: 'type-1',
    });

    const { result: packagesResult } = renderHook(() => usePackages());
    await expect(packagesResult.current.queryFn()).resolves.toEqual([
      { id: 'pkg-1' },
    ]);

    const { result: packageResult } = renderHook(() => usePackage('pkg-1'));
    await expect(packageResult.current.queryFn()).resolves.toEqual({
      id: 'pkg-1',
    });

    const { result: itemUnitsResult } = renderHook(() => useItemUnits());
    await expect(itemUnitsResult.current.queryFn()).resolves.toEqual([
      { id: 'unit-1' },
    ]);

    const { result: itemUnitResult } = renderHook(() => useItemUnit('unit-1'));
    await expect(itemUnitResult.current.queryFn()).resolves.toEqual({
      id: 'unit-1',
    });

    const { result: supplierResult } = renderHook(() => useSupplier('sup-1'));
    await expect(supplierResult.current.queryFn()).resolves.toEqual({
      id: 'sup-1',
    });

    const { result: searchSuppliersResult } = renderHook(() =>
      useSearchSuppliers('target')
    );
    await expect(searchSuppliersResult.current.queryFn()).resolves.toEqual([
      { id: 'sup-1' },
    ]);

    const { result: allMasterDataResult } = renderHook(() =>
      useAllMasterData()
    );
    await expect(allMasterDataResult.current.queryFn()).resolves.toEqual({
      data: {},
      errors: {},
    });

    masterDataServiceMock.categories.getById.mockResolvedValueOnce({
      data: null,
      error: new Error('missing category'),
    });
    await expect(categoryResult.current.queryFn()).rejects.toThrow(
      'missing category'
    );

    masterDataServiceMock.getAllMasterData.mockResolvedValueOnce({
      data: null,
      errors: { categories: new Error('boom') },
    });
    await expect(allMasterDataResult.current.queryFn()).rejects.toThrow(
      'Failed to fetch master data'
    );
  });

  it('runs category mutations with success and failure callbacks', async () => {
    const payload = { name: 'Kategori A' };
    masterDataServiceMock.categories.create.mockResolvedValue({
      data: { id: 'cat-1', ...payload },
      error: null,
    });
    masterDataServiceMock.categories.update.mockResolvedValue({
      data: { id: 'cat-1', name: 'Kategori B' },
      error: null,
    });
    masterDataServiceMock.categories.delete.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result } = renderHook(() => useCategoryMutations());

    await act(async () => {
      await result.current.createCategory.mutateAsync(payload);
      await result.current.updateCategory.mutateAsync({
        id: 'cat-1',
        data: { name: 'Kategori B' },
      });
      await result.current.deleteCategory.mutateAsync('cat-1');
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Kategori berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Kategori berhasil diperbarui'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Kategori berhasil dihapus');
    expect(invalidateQueriesMock).toHaveBeenCalled();
    expect(refetchQueriesMock).toHaveBeenCalled();

    masterDataServiceMock.categories.create.mockResolvedValueOnce({
      data: null,
      error: new Error('create failed'),
    });
    await expect(
      result.current.createCategory.mutateAsync(payload)
    ).rejects.toThrow('create failed');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menambahkan kategori');
  });

  it('runs medicine type, package, and item unit mutations', async () => {
    masterDataServiceMock.types.create.mockResolvedValue({
      data: { id: 'type-1' },
      error: null,
    });
    masterDataServiceMock.types.update.mockResolvedValue({
      data: { id: 'type-1' },
      error: null,
    });
    masterDataServiceMock.types.delete.mockResolvedValue({
      data: null,
      error: null,
    });

    masterDataServiceMock.packages.create.mockResolvedValue({
      data: { id: 'pkg-1' },
      error: null,
    });
    masterDataServiceMock.packages.update.mockResolvedValue({
      data: { id: 'pkg-1' },
      error: null,
    });
    masterDataServiceMock.packages.delete.mockResolvedValue({
      data: null,
      error: null,
    });

    masterDataServiceMock.itemUnits.create.mockResolvedValue({
      data: { id: 'unit-1' },
      error: null,
    });
    masterDataServiceMock.itemUnits.update.mockResolvedValue({
      data: { id: 'unit-1' },
      error: null,
    });
    masterDataServiceMock.itemUnits.delete.mockResolvedValue({
      data: null,
      error: null,
    });

    const { result: typesMutations } = renderHook(() =>
      useMedicineTypeMutations()
    );
    const { result: packageMutations } = renderHook(() =>
      usePackageMutations()
    );
    const { result: itemUnitMutations } = renderHook(() =>
      useItemUnitMutations()
    );

    await act(async () => {
      await typesMutations.current.createMedicineType.mutateAsync({
        name: 'T',
      });
      await typesMutations.current.updateMedicineType.mutateAsync({
        id: 'type-1',
        data: { name: 'T2' },
      });
      await typesMutations.current.deleteMedicineType.mutateAsync('type-1');

      await packageMutations.current.createPackage.mutateAsync({ name: 'P' });
      await packageMutations.current.updatePackage.mutateAsync({
        id: 'pkg-1',
        data: { name: 'P2' },
      });
      await packageMutations.current.deletePackage.mutateAsync('pkg-1');

      await itemUnitMutations.current.createItemUnit.mutateAsync({
        name: 'Unit',
      });
      await itemUnitMutations.current.updateItemUnit.mutateAsync({
        id: 'unit-1',
        data: { name: 'Unit2' },
      });
      await itemUnitMutations.current.deleteItemUnit.mutateAsync('unit-1');
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Jenis obat berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Jenis obat berhasil diperbarui'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Jenis obat berhasil dihapus'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Kemasan berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Kemasan berhasil diperbarui'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Kemasan berhasil dihapus');
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Satuan berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Satuan berhasil diperbarui');
    expect(toastSuccessMock).toHaveBeenCalledWith('Satuan berhasil dihapus');
    expect(invalidateQueriesMock).toHaveBeenCalled();

    masterDataServiceMock.types.update.mockResolvedValueOnce({
      data: null,
      error: new Error('type update failed'),
    });
    await expect(
      typesMutations.current.updateMedicineType.mutateAsync({
        id: 'type-1',
        data: { name: 'fail' },
      })
    ).rejects.toThrow('type update failed');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal memperbarui jenis obat');
  });

  it('runs supplier mutations and supplier image caching effect', async () => {
    masterDataServiceMock.suppliers.create.mockResolvedValue({
      data: { id: 'sup-1' },
      error: null,
    });
    masterDataServiceMock.suppliers.update.mockResolvedValue({
      data: { id: 'sup-1' },
      error: null,
    });
    masterDataServiceMock.suppliers.delete.mockResolvedValue({
      data: null,
      error: null,
    });

    useQueryMock.mockImplementationOnce(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
      }) => ({
        data: [
          { id: 'sup-1', image_url: 'https://img.example/sup-1.jpg' },
          { id: 'sup-2', image_url: null },
          { id: '', image_url: 'https://img.example/invalid.jpg' },
        ],
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        isPlaceholderData: false,
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        enabled: config.enabled,
      })
    );

    renderHook(() => useSuppliers());
    expect(setCachedImageMock).toHaveBeenCalledWith(
      'identity:sup-1',
      'https://img.example/sup-1.jpg'
    );
    expect(preloadImageMock).toHaveBeenCalledWith(
      'https://img.example/sup-1.jpg'
    );
    expect(setCachedImageMock).toHaveBeenCalledTimes(1);
    expect(preloadImageMock).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useSupplierMutations());

    await act(async () => {
      await result.current.createSupplier.mutateAsync({ name: 'Supplier A' });
      await result.current.updateSupplier.mutateAsync({
        id: 'sup-1',
        data: { name: 'Supplier B' },
      });
      await result.current.deleteSupplier.mutateAsync('sup-1');
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Supplier berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Supplier berhasil diperbarui'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Supplier berhasil dihapus');

    masterDataServiceMock.suppliers.delete.mockResolvedValueOnce({
      data: null,
      error: new Error('supplier delete failed'),
    });
    await expect(
      result.current.deleteSupplier.mutateAsync('sup-1')
    ).rejects.toThrow('supplier delete failed');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menghapus supplier');
  });
});
