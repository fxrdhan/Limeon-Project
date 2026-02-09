import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useItemFormValidation } from './useItemValidation';

const createFormData = (
  overrides: Partial<{
    code: string;
    name: string;
    category_id: string;
    type_id: string;
    package_id: string;
    unit_id: string;
    dosage_id: string;
    manufacturer_id: string;
    base_price: number;
    sell_price: number;
  }> = {}
) => ({
  code: 'ITM-001',
  name: 'Paracetamol',
  category_id: 'cat-1',
  type_id: 'type-1',
  package_id: 'pack-1',
  unit_id: 'unit-1',
  dosage_id: 'dosage-1',
  manufacturer_id: 'manufacturer-1',
  base_price: 10000,
  sell_price: 12000,
  ...overrides,
});

describe('useItemFormValidation', () => {
  it('flags invalid form when required fields are empty', () => {
    const { result } = renderHook(() =>
      useItemFormValidation({
        formData: createFormData({ name: '   ' }),
        isEditMode: false,
        operationsPending: false,
      })
    );

    expect(result.current.formIsInvalid).toBe(true);
    expect(result.current.finalDisabledState).toBe(true);
  });

  it('disables submit when operations are pending', () => {
    const { result } = renderHook(() =>
      useItemFormValidation({
        formData: createFormData(),
        isEditMode: false,
        operationsPending: true,
      })
    );

    expect(result.current.formIsInvalid).toBe(false);
    expect(result.current.operationsPending).toBe(true);
    expect(result.current.finalDisabledState).toBe(true);
  });

  it('enables submit in create mode when form is valid and no pending operation', () => {
    const { result } = renderHook(() =>
      useItemFormValidation({
        formData: createFormData(),
        isEditMode: false,
        operationsPending: false,
      })
    );

    expect(result.current.formIsInvalid).toBe(false);
    expect(result.current.finalDisabledState).toBe(false);
  });

  it('respects dirty-state function in edit mode', () => {
    const notDirty = vi.fn(() => false);
    const { result, rerender } = renderHook(
      ({ isDirtyFn }: { isDirtyFn?: () => boolean }) =>
        useItemFormValidation({
          formData: createFormData(),
          isDirtyFn,
          isEditMode: true,
          operationsPending: false,
        }),
      { initialProps: { isDirtyFn: notDirty } }
    );

    expect(result.current.finalDisabledState).toBe(true);

    const dirty = vi.fn(() => true);
    rerender({ isDirtyFn: dirty });
    expect(result.current.finalDisabledState).toBe(false);

    rerender({ isDirtyFn: undefined });
    expect(result.current.finalDisabledState).toBe(false);
  });
});
