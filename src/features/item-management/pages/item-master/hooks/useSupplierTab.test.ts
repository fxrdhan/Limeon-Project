import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Supplier } from '@/types';
import { useSupplierTab } from './useSupplierTab';

const createTextColumnMock = vi.hoisted(() => vi.fn());
const useSuppliersMock = vi.hoisted(() => vi.fn());
const useSupplierMutationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ag-grid', () => ({
  createTextColumn: createTextColumnMock,
}));

vi.mock('@/hooks/queries', () => ({
  useSuppliers: useSuppliersMock,
  useSupplierMutations: useSupplierMutationsMock,
}));

describe('useSupplierTab', () => {
  beforeEach(() => {
    createTextColumnMock.mockReset();
    useSuppliersMock.mockReset();
    useSupplierMutationsMock.mockReset();

    createTextColumnMock.mockImplementation(config => config);
    useSuppliersMock.mockReturnValue({ data: [] });
    useSupplierMutationsMock.mockReturnValue({
      create: vi.fn(),
      update: vi.fn(),
    });
  });

  it('builds supplier fields, column defs, and fallback row data', () => {
    const supplier: Supplier = {
      id: 'sup-1',
      created_at: '2025-01-01T00:00:00.000Z',
      name: 'PT Farmasi Satu',
      address: 'Jl. Utama',
      phone: '08123',
      email: 'sales@farmasi.test',
      contact_person: 'Budi',
    };
    const queryValue = { data: [supplier] };
    const mutationValue = { create: vi.fn(), update: vi.fn() };

    useSuppliersMock.mockReturnValue(queryValue);
    useSupplierMutationsMock.mockReturnValue(mutationValue);

    const { result } = renderHook(() => useSupplierTab());

    expect(useSuppliersMock).toHaveBeenCalledWith({ enabled: true });
    expect(result.current.suppliersQuery).toBe(queryValue);
    expect(result.current.supplierMutations).toBe(mutationValue);
    expect(result.current.suppliersData).toEqual([supplier]);
    expect(result.current.supplierFields).toHaveLength(5);
    expect(result.current.supplierFields[0]).toMatchObject({
      key: 'name',
      label: 'Nama Supplier',
    });

    expect(createTextColumnMock).toHaveBeenCalledTimes(5);
    expect(result.current.supplierColumnDefs).toHaveLength(5);

    const firstColumn = result.current.supplierColumnDefs[0];
    expect(firstColumn.field).toBe('suppliers.name');
    expect(firstColumn.valueGetter?.({ data: supplier } as never)).toBe(
      'PT Farmasi Satu'
    );
    expect(firstColumn.valueGetter?.({ data: null } as never)).toBe('-');

    const secondColumn = result.current.supplierColumnDefs[1];
    expect(secondColumn.valueGetter?.({ data: supplier } as never)).toBe(
      'Jl. Utama'
    );
    expect(secondColumn.valueGetter?.({ data: null } as never)).toBe('-');

    const thirdColumn = result.current.supplierColumnDefs[2];
    expect(thirdColumn.valueGetter?.({ data: supplier } as never)).toBe(
      '08123'
    );
    expect(thirdColumn.valueGetter?.({ data: null } as never)).toBe('-');

    const fourthColumn = result.current.supplierColumnDefs[3];
    expect(fourthColumn.valueGetter?.({ data: supplier } as never)).toBe(
      'sales@farmasi.test'
    );
    expect(fourthColumn.valueGetter?.({ data: null } as never)).toBe('-');

    const fifthColumn = result.current.supplierColumnDefs[4];
    expect(fifthColumn.valueGetter?.({ data: supplier } as never)).toBe('Budi');
    expect(fifthColumn.valueGetter?.({ data: null } as never)).toBe('-');
  });

  it('toggles add/edit supplier modal state and editing entity', () => {
    const sampleSupplier: Supplier = {
      id: 'sup-2',
      created_at: '2025-01-01T00:00:00.000Z',
      name: 'CV Medika',
      address: null,
      phone: null,
      email: null,
      contact_person: null,
    };

    const { result } = renderHook(() => useSupplierTab());

    expect(result.current.isAddSupplierModalOpen).toBe(false);
    expect(result.current.isEditSupplierModalOpen).toBe(false);
    expect(result.current.editingSupplier).toBeNull();

    act(() => {
      result.current.openAddSupplierModal();
    });
    expect(result.current.isAddSupplierModalOpen).toBe(true);

    act(() => {
      result.current.closeAddSupplierModal();
    });
    expect(result.current.isAddSupplierModalOpen).toBe(false);

    act(() => {
      result.current.openEditSupplierModal(sampleSupplier);
    });
    expect(result.current.isEditSupplierModalOpen).toBe(true);
    expect(result.current.editingSupplier).toEqual(sampleSupplier);

    act(() => {
      result.current.closeEditSupplierModal();
    });
    expect(result.current.isEditSupplierModalOpen).toBe(false);
    expect(result.current.editingSupplier).toBeNull();
  });

  it('falls back to empty suppliersData when query data is nullish', () => {
    useSuppliersMock.mockReturnValueOnce({ data: null });

    const { result } = renderHook(() => useSupplierTab());

    expect(result.current.suppliersData).toEqual([]);
  });
});
