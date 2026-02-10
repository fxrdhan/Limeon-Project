import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemModalOrchestrator } from './useItemModalOrchestrator';

const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

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
    toastErrorMock.mockReset();
  });

  it('opens add modals with search term and can close modal while clearing search', () => {
    const formState = createFormState();
    const mutations = createMutations();

    const { result } = renderHook(() =>
      useItemModalOrchestrator({
        formState,
        mutations,
      })
    );

    act(() => {
      result.current.handleAddNewCategory('kat');
      result.current.handleAddNewType('type');
      result.current.handleAddNewUnit('unit');
      result.current.handleAddNewDosage('dosage');
      result.current.handleAddNewManufacturer('manu');
      result.current.closeModalAndClearSearch(formState.setIsAddTypeModalOpen);
    });

    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith('kat');
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith('type');
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith('unit');
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith(
      'dosage'
    );
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith('manu');

    expect(formState.setIsAddEditModalOpen).toHaveBeenCalledWith(true);
    expect(formState.setIsAddTypeModalOpen).toHaveBeenCalledWith(true);
    expect(formState.setIsAddUnitModalOpen).toHaveBeenCalledWith(true);
    expect(formState.setIsAddDosageModalOpen).toHaveBeenCalledWith(true);
    expect(formState.setIsAddManufacturerModalOpen).toHaveBeenCalledWith(true);

    expect(formState.setIsAddTypeModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith(
      undefined
    );
  });

  it('handles all save handlers on success and updates selected ids', async () => {
    const formState = createFormState();
    const mutations = createMutations();

    mutations.saveCategory.mockResolvedValue({
      newCategory: { id: 'cat-1' },
      updatedCategories: [{ id: 'cat-1' }],
    });
    mutations.saveType.mockResolvedValue({
      newType: { id: 'type-1' },
      updatedTypes: [{ id: 'type-1' }],
    });
    mutations.saveUnit.mockResolvedValue({
      newUnit: { id: 'pkg-1' },
      updatedPackages: [{ id: 'pkg-1' }],
    });
    mutations.saveDosage.mockResolvedValue({
      newDosage: { id: 'dos-1' },
      updatedDosages: [{ id: 'dos-1' }],
    });
    mutations.saveManufacturer.mockResolvedValue({
      newManufacturer: { id: 'man-1' },
      updatedManufacturers: [{ id: 'man-1' }],
    });

    const { result } = renderHook(() =>
      useItemModalOrchestrator({
        formState,
        mutations,
      })
    );

    await act(async () => {
      await result.current.handleSaveCategory({ name: 'Kategori A' });
      await result.current.handleSaveType({ name: 'Type A' });
      await result.current.handleSaveUnit({ name: 'Pcs' });
      await result.current.handleSaveDosage({ name: 'Tablet' });
      await result.current.handleSaveManufacturer({
        name: 'Produsen A',
        address: 'Jakarta',
      });
    });

    expect(formState.setCategories).toHaveBeenCalledWith([{ id: 'cat-1' }]);
    expect(formState.setTypes).toHaveBeenCalledWith([{ id: 'type-1' }]);
    expect(formState.setPackages).toHaveBeenCalledWith([{ id: 'pkg-1' }]);
    expect(formState.setDosages).toHaveBeenCalledWith([{ id: 'dos-1' }]);
    expect(formState.setManufacturers).toHaveBeenCalledWith([{ id: 'man-1' }]);

    expect(formState.updateFormData).toHaveBeenCalledWith({
      category_id: 'cat-1',
    });
    expect(formState.updateFormData).toHaveBeenCalledWith({
      type_id: 'type-1',
    });
    expect(formState.updateFormData).toHaveBeenCalledWith({
      package_id: 'pkg-1',
    });
    expect(formState.updateFormData).toHaveBeenCalledWith({
      dosage_id: 'dos-1',
    });
    expect(formState.updateFormData).toHaveBeenCalledWith({
      manufacturer_id: 'man-1',
    });

    expect(formState.setIsAddEditModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddTypeModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddUnitModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddDosageModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddManufacturerModalOpen).toHaveBeenCalledWith(false);
  });

  it('shows error toasts when save handlers fail', async () => {
    const formState = createFormState();
    const mutations = createMutations();

    mutations.saveCategory.mockRejectedValue(new Error('category'));
    mutations.saveType.mockRejectedValue(new Error('type'));
    mutations.saveUnit.mockRejectedValue(new Error('unit'));
    mutations.saveDosage.mockRejectedValue(new Error('dosage'));
    mutations.saveManufacturer.mockRejectedValue(new Error('manufacturer'));

    const { result } = renderHook(() =>
      useItemModalOrchestrator({
        formState,
        mutations,
      })
    );

    await act(async () => {
      await result.current.handleSaveCategory({ name: 'x' });
      await result.current.handleSaveType({ name: 'x' });
      await result.current.handleSaveUnit({ name: 'x' });
      await result.current.handleSaveDosage({ name: 'x' });
      await result.current.handleSaveManufacturer({ name: 'x' });
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menyimpan kategori baru.'
    );
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menyimpan jenis item baru.'
    );
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menyimpan satuan baru.');
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menyimpan sediaan baru.'
    );
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Gagal menyimpan produsen baru.'
    );
  });

  it('handles save handlers when no updated arrays and no new ids are returned', async () => {
    const formState = createFormState();
    const mutations = createMutations();

    mutations.saveCategory.mockResolvedValue({});
    mutations.saveType.mockResolvedValue({});
    mutations.saveUnit.mockResolvedValue({});
    mutations.saveDosage.mockResolvedValue({});
    mutations.saveManufacturer.mockResolvedValue({});

    const { result } = renderHook(() =>
      useItemModalOrchestrator({
        formState,
        mutations,
      })
    );

    await act(async () => {
      await result.current.handleSaveCategory({ name: 'A' });
      await result.current.handleSaveType({ name: 'B' });
      await result.current.handleSaveUnit({ name: 'C' });
      await result.current.handleSaveDosage({ name: 'D' });
      await result.current.handleSaveManufacturer({ name: 'E' });
    });

    expect(formState.setCategories).not.toHaveBeenCalled();
    expect(formState.setTypes).not.toHaveBeenCalled();
    expect(formState.setPackages).not.toHaveBeenCalled();
    expect(formState.setDosages).not.toHaveBeenCalled();
    expect(formState.setManufacturers).not.toHaveBeenCalled();
    expect(formState.updateFormData).not.toHaveBeenCalled();

    expect(formState.setIsAddEditModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddTypeModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddUnitModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddDosageModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setIsAddManufacturerModalOpen).toHaveBeenCalledWith(false);
    expect(formState.setCurrentSearchTermForModal).toHaveBeenCalledWith(
      undefined
    );
  });
});
