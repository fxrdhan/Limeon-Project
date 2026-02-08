import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdentityForm } from './identityForm';

const fields = [
  { key: 'name', label: 'Nama', type: 'text', editable: true },
  { key: 'address', label: 'Alamat', type: 'textarea', editable: true },
  { key: 'birth_date', label: 'Tanggal Lahir', type: 'date', editable: true },
] as never;

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  initialData: {
    id: 'entity-1',
    name: 'Awal',
    address: 'Jl. Lama',
    image_url: 'https://img.example.com/old.png',
  },
  fields,
  onSave: vi.fn().mockResolvedValue(undefined),
  mode: 'edit' as const,
  isOpen: true,
  ...overrides,
});

describe('useIdentityForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://preview-image');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes add mode state, applies initial search name, and focuses registered ref', () => {
    const props = makeProps({
      mode: 'add',
      isOpen: false,
      initialNameFromSearch: 'Nama Dari Pencarian',
      initialData: {
        id: 'entity-1',
        name: '',
        address: '',
      },
    });

    const { result, rerender } = renderHook(
      currentProps => useIdentityForm(currentProps),
      {
        initialProps: props,
      }
    );

    const focusSpy = vi.fn();
    const selectSpy = vi.fn();
    act(() => {
      result.current.setInputRef('name', {
        focus: focusSpy,
        select: selectSpy,
      } as unknown as HTMLInputElement);
    });

    rerender({ ...props, isOpen: true });

    expect(result.current.editMode.name).toBe(true);
    expect(result.current.editValues.name).toBe('Nama Dari Pencarian');
    expect(result.current.localData).toEqual({
      id: 'entity-1',
      name: '',
      address: '',
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resetInternalState();
    });
    expect(result.current.editMode).toEqual({});
    expect(result.current.editValues).toEqual({});
  });

  it('handles field edits with and without onFieldSave, including error path', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const onFieldSave = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('gagal simpan'));

    const editableProps = makeProps({
      onFieldSave,
    });
    const { result } = renderHook(
      currentProps => useIdentityForm(currentProps),
      {
        initialProps: editableProps,
      }
    );

    const focusSpy = vi.fn();
    const selectSpy = vi.fn();
    act(() => {
      result.current.setInputRef('name', {
        focus: focusSpy,
        select: selectSpy,
      } as unknown as HTMLInputElement);
      result.current.toggleEdit('name');
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleChange('name', 'Nama Baru');
    });
    await act(async () => {
      await result.current.handleSaveField('name');
    });

    expect(onFieldSave).toHaveBeenNthCalledWith(1, 'name', 'Nama Baru');
    expect(result.current.localData.name).toBe('Nama Baru');
    expect(result.current.editMode.name).toBe(false);
    expect(result.current.loadingField.name).toBe(false);

    act(() => {
      result.current.toggleEdit('name');
      result.current.handleChange('name', 'Nama Error');
    });
    await act(async () => {
      await result.current.handleSaveField('name');
    });
    expect(onFieldSave).toHaveBeenNthCalledWith(2, 'name', 'Nama Error');
    expect(errorSpy).toHaveBeenCalled();

    const noFieldSaveProps = makeProps({
      onFieldSave: undefined,
    });
    const noFieldSave = renderHook(
      currentProps => useIdentityForm(currentProps),
      {
        initialProps: noFieldSaveProps,
      }
    );
    act(() => {
      noFieldSave.result.current.handleChange('name', 'Tanpa Handler');
    });
    await act(async () => {
      await noFieldSave.result.current.handleSaveField('name');
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(noFieldSave.result.current.localData.name).toBe('Tanpa Handler');
  });

  it('handles save-all payload and image upload/delete for add and edit modes', async () => {
    const saveAll = vi.fn().mockRejectedValueOnce(new Error('save failed'));
    const saveErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const addModeProps = makeProps({
      mode: 'add',
      onSave: saveAll,
      initialImageUrl: 'data:image/png;base64,abc',
    });
    const addMode = renderHook(currentProps => useIdentityForm(currentProps), {
      initialProps: addModeProps,
    });

    act(() => {
      addMode.result.current.handleChange('name', 'Nama Add');
      addMode.result.current.handleCancelEdit('name');
    });
    expect(addMode.result.current.editValues.name).toBe('Awal');
    expect(addMode.result.current.editMode.name).toBe(false);

    await act(async () => {
      await addMode.result.current.handleSaveAll();
    });
    expect(saveAll).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Awal',
        image_url: 'data:image/png;base64,abc',
      })
    );
    expect(saveErrorSpy).toHaveBeenCalled();
    expect(addMode.result.current.isSubmitting).toBe(false);

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await addMode.result.current.handleImageUpload(file);
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(addMode.result.current.currentImageUrl).toBe('blob://preview-image');

    await act(async () => {
      await addMode.result.current.handleImageDeleteInternal();
    });
    expect(addMode.result.current.currentImageUrl).toBeUndefined();

    const onImageSave = vi.fn().mockResolvedValue(undefined);
    const onImageDelete = vi.fn().mockResolvedValue(undefined);
    const editModeProps = makeProps({
      mode: 'edit',
      onImageSave,
      onImageDelete,
    });
    const editMode = renderHook(currentProps => useIdentityForm(currentProps), {
      initialProps: editModeProps,
    });

    await act(async () => {
      await editMode.result.current.handleImageUpload(file);
    });
    expect(onImageSave).toHaveBeenCalledWith({ entityId: 'entity-1', file });

    await act(async () => {
      await editMode.result.current.handleImageDeleteInternal();
    });
    expect(onImageDelete).toHaveBeenCalledWith('entity-1');
    expect(editMode.result.current.localData.image_url).toBeNull();
  });
});
