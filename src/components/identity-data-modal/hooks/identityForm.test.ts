import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { FieldConfig } from '../../../types/components';
import { useIdentityForm } from './identityForm';

const fields: FieldConfig[] = [{ key: 'name', label: 'Nama', type: 'text' }];
const initialData = {};
const onSave = vi.fn().mockResolvedValue({ id: 'supplier-1' });

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

const renderIdentityForm = (isOpen: boolean) =>
  renderHook(
    ({ open }) =>
      useIdentityForm({
        fields,
        initialData,
        initialNameFromSearch: 'Supplier Baru',
        isOpen: open,
        mode: 'add',
        onSave,
      }),
    {
      initialProps: { open: isOpen },
    }
  );

describe('useIdentityForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('cancels pending initial name focus when the modal closes before the delay', () => {
    const input = document.createElement('input');
    document.body.append(input);

    const { result, rerender } = renderIdentityForm(true);
    result.current.setInputRef('name', input);

    rerender({ open: false });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(document.activeElement).not.toBe(input);
  });

  it('ignores duplicate full-form saves while the first save is pending', async () => {
    const save = createDeferred<{ id: string }>();
    const saveHandler = vi.fn().mockReturnValue(save.promise);
    const data = { id: 'supplier-1', name: 'Supplier Lama' };
    const { result } = renderHook(() =>
      useIdentityForm({
        fields,
        initialData: data,
        isOpen: true,
        mode: 'edit',
        onSave: saveHandler,
      })
    );

    act(() => {
      result.current.handleChange('name', 'Supplier Baru');
    });

    let firstSave: Promise<void> = Promise.resolve();
    let secondSave: Promise<void> = Promise.resolve();
    act(() => {
      firstSave = result.current.handleSaveAll();
      secondSave = result.current.handleSaveAll();
    });

    expect(saveHandler).toHaveBeenCalledOnce();

    await act(async () => {
      save.resolve({ id: 'supplier-1' });
      await firstSave;
      await secondSave;
    });

    expect(result.current.localData.name).toBe('Supplier Baru');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not let a stale full-form save overwrite a reopened modal session', async () => {
    const save = createDeferred<{ id: string }>();
    const saveHandler = vi.fn().mockReturnValue(save.promise);
    const firstProps = {
      data: { id: 'supplier-a', name: 'Supplier A' },
      open: true,
      onSave: saveHandler,
    };
    const secondProps = {
      data: { id: 'supplier-b', name: 'Supplier B' },
      open: true,
      onSave: vi.fn().mockResolvedValue({ id: 'supplier-b' }),
    };
    const { result, rerender } = renderHook(
      ({ data, open, onSave: currentOnSave }) =>
        useIdentityForm({
          fields,
          initialData: data,
          isOpen: open,
          mode: 'edit',
          onSave: currentOnSave,
        }),
      { initialProps: firstProps }
    );

    act(() => {
      result.current.handleChange('name', 'Supplier Stale');
    });

    let staleSave: Promise<void> = Promise.resolve();
    act(() => {
      staleSave = result.current.handleSaveAll();
    });

    rerender({ ...firstProps, open: false });
    rerender(secondProps);

    await act(async () => {
      save.resolve({ id: 'supplier-a' });
      await staleSave;
    });

    expect(result.current.localData.name).toBe('Supplier B');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('does not run stale image delete side effects after the modal session changes', async () => {
    const save = createDeferred<{ id: string }>();
    const imageDelete = vi.fn().mockResolvedValue(undefined);
    const firstProps = {
      data: {
        id: 'supplier-a',
        image_url: 'old-image.jpg',
        name: 'Supplier A',
      },
      open: true,
      onSave: vi.fn().mockReturnValue(save.promise),
    };
    const secondProps = {
      data: {
        id: 'supplier-b',
        image_url: 'new-image.jpg',
        name: 'Supplier B',
      },
      open: true,
      onSave: vi.fn().mockResolvedValue({ id: 'supplier-b' }),
    };
    const { result, rerender } = renderHook(
      ({ data, open, onSave: currentOnSave }) =>
        useIdentityForm({
          fields,
          initialData: data,
          initialImageUrl:
            typeof data.image_url === 'string' ? data.image_url : undefined,
          isOpen: open,
          mode: 'edit',
          onImageDelete: imageDelete,
          onSave: currentOnSave,
        }),
      { initialProps: firstProps }
    );

    act(() => {
      void result.current.handleImageDeleteInternal();
    });

    let staleSave: Promise<void> = Promise.resolve();
    act(() => {
      staleSave = result.current.handleSaveAll();
    });

    rerender({ ...firstProps, open: false });
    rerender(secondProps);

    await act(async () => {
      save.resolve({ id: 'supplier-a' });
      await staleSave;
    });

    expect(imageDelete).not.toHaveBeenCalled();
    expect(result.current.localData.name).toBe('Supplier B');
  });

  it('ignores duplicate field saves while the same field is pending', async () => {
    const fieldSave = createDeferred<void>();
    const fieldSaveHandler = vi.fn().mockReturnValue(fieldSave.promise);
    const data = { id: 'supplier-1', name: 'Supplier Lama' };
    const { result } = renderHook(() =>
      useIdentityForm({
        fields,
        initialData: data,
        isOpen: true,
        mode: 'edit',
        onFieldSave: fieldSaveHandler,
        onSave,
        useInlineFieldActions: true,
      })
    );

    act(() => {
      result.current.handleChange('name', 'Supplier Baru');
    });

    let firstSave: Promise<void> = Promise.resolve();
    let secondSave: Promise<void> = Promise.resolve();
    act(() => {
      firstSave = result.current.handleSaveField('name');
      secondSave = result.current.handleSaveField('name');
    });

    expect(fieldSaveHandler).toHaveBeenCalledOnce();

    await act(async () => {
      fieldSave.resolve();
      await firstSave;
      await secondSave;
    });

    expect(result.current.localData.name).toBe('Supplier Baru');
    expect(result.current.loadingField.name).toBe(false);
  });

  it('does not let a stale field save overwrite a reopened modal session', async () => {
    const fieldSave = createDeferred<void>();
    const fieldSaveHandler = vi.fn().mockReturnValue(fieldSave.promise);
    const firstProps = {
      data: { id: 'supplier-a', name: 'Supplier A' },
      open: true,
      onFieldSave: fieldSaveHandler,
    };
    const secondProps = {
      data: { id: 'supplier-b', name: 'Supplier B' },
      open: true,
      onFieldSave: vi.fn().mockResolvedValue(undefined),
    };
    const { result, rerender } = renderHook(
      ({ data, open, onFieldSave: currentOnFieldSave }) =>
        useIdentityForm({
          fields,
          initialData: data,
          isOpen: open,
          mode: 'edit',
          onFieldSave: currentOnFieldSave,
          onSave,
          useInlineFieldActions: true,
        }),
      { initialProps: firstProps }
    );

    act(() => {
      result.current.handleChange('name', 'Supplier Stale');
    });

    let staleFieldSave: Promise<void> = Promise.resolve();
    act(() => {
      staleFieldSave = result.current.handleSaveField('name');
    });

    rerender({ ...firstProps, open: false });
    rerender(secondProps);

    await act(async () => {
      fieldSave.resolve();
      await staleFieldSave;
    });

    expect(result.current.localData.name).toBe('Supplier B');
    expect(result.current.loadingField.name).toBeUndefined();
  });
});
