import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ItemCategory } from '../../../shared/types';
import { useItemModalOrchestrator } from './useItemModalOrchestrator';

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
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

const createCategory = (id: string): ItemCategory =>
  ({
    id,
    code: id.toUpperCase(),
    name: `Category ${id}`,
  }) as ItemCategory;

const createFormState = () => ({
  setCurrentSearchTermForModal: vi.fn(),
  setIsAddEditModalOpen: vi.fn(),
  setIsAddTypeModalOpen: vi.fn(),
  setIsAddUnitModalOpen: vi.fn(),
  setIsAddDosageModalOpen: vi.fn(),
  setIsAddManufacturerModalOpen: vi.fn(),
  setCategories: vi.fn(),
  setTypes: vi.fn(),
  setPackages: vi.fn(),
  setUnits: vi.fn(),
  setDosages: vi.fn(),
  setManufacturers: vi.fn(),
  updateFormData: vi.fn(),
});

const createMutations = () => ({
  saveCategory: vi.fn(),
  saveType: vi.fn(),
  saveUnit: vi.fn(),
  saveDosage: vi.fn(),
  saveManufacturer: vi.fn(),
});

describe('useItemModalOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates form data and closes the category modal after the current save succeeds', async () => {
    const formState = createFormState();
    const mutations = createMutations();
    const category = createCategory('cat-1');
    mutations.saveCategory.mockResolvedValue({
      newCategory: category,
      updatedCategories: [category],
    });

    const { result } = renderHook(() =>
      useItemModalOrchestrator({ formState, mutations })
    );

    act(() => {
      result.current.handleAddNewCategory('obat');
    });

    await act(async () => {
      await result.current.handleSaveCategory({ name: 'Obat' });
    });

    expect(formState.setCategories).toHaveBeenCalledWith([category]);
    expect(formState.updateFormData).toHaveBeenCalledWith({
      category_id: 'cat-1',
    });
    expect(formState.setIsAddEditModalOpen).toHaveBeenLastCalledWith(false);
    expect(formState.setCurrentSearchTermForModal).toHaveBeenLastCalledWith(
      undefined
    );
  });

  it('does not let a stale category save update or close a reopened modal', async () => {
    const formState = createFormState();
    const mutations = createMutations();
    const saveCategory = createDeferred<{
      newCategory: ItemCategory;
      updatedCategories: ItemCategory[];
    }>();
    const staleCategory = createCategory('stale-category');
    mutations.saveCategory.mockReturnValueOnce(saveCategory.promise);

    const { result } = renderHook(() =>
      useItemModalOrchestrator({ formState, mutations })
    );

    act(() => {
      result.current.handleAddNewCategory('old search');
    });

    let savePromise: Promise<void> = Promise.resolve();
    act(() => {
      savePromise = result.current.handleSaveCategory({ name: 'Old' });
    });

    act(() => {
      result.current.closeModalAndClearSearch(formState.setIsAddEditModalOpen);
      result.current.handleAddNewCategory('new search');
    });

    await act(async () => {
      saveCategory.resolve({
        newCategory: staleCategory,
        updatedCategories: [staleCategory],
      });
      await savePromise.catch(() => undefined);
      await Promise.resolve();
    });

    expect(formState.setCategories).not.toHaveBeenCalled();
    expect(formState.updateFormData).not.toHaveBeenCalled();
    expect(formState.setIsAddEditModalOpen.mock.calls).toEqual([
      [true],
      [false],
      [true],
    ]);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});
