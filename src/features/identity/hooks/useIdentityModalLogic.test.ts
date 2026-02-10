import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdentityModalLogic } from './useIdentityModalLogic';

const useIdentityFormMock = vi.hoisted(() => vi.fn());
const formatDateTimeMock = vi.hoisted(() => vi.fn());

vi.mock('./identityForm', () => ({
  useIdentityForm: (options: Record<string, unknown>) =>
    useIdentityFormMock(options),
}));

vi.mock('@/lib/formatters', () => ({
  formatDateTime: (value: string | null) => formatDateTimeMock(value),
}));

const baseIdentityFormState = () => ({
  editMode: {},
  editValues: { name: 'Awal' },
  currentImageUrl: 'https://img.example.com/current.png',
  isUploadingImage: false,
  loadingField: { name: false },
  isSubmitting: false,
  isDirty: false,
  localData: { id: 'id-1', name: 'Awal' },
  toggleEdit: vi.fn(),
  handleChange: vi.fn(),
  handleSaveField: vi.fn(),
  handleSaveAll: vi.fn(),
  handleCancelEdit: vi.fn(),
  handleImageUpload: vi.fn(),
  handleImageDeleteInternal: vi.fn(),
  resetInternalState: vi.fn(),
  setInputRef: vi.fn(),
});

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  title: 'Modal Identitas',
  data: { id: 'id-1', name: 'Awal', updated_at: '2026-02-01T08:00:00.000Z' },
  fields: [{ key: 'name', label: 'Nama', type: 'text', editable: true }],
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  onFieldSave: vi.fn().mockResolvedValue(undefined),
  onImageSave: vi.fn().mockResolvedValue(undefined),
  onImageDelete: vi.fn().mockResolvedValue(undefined),
  imageUrl: 'https://img.example.com/current.png',
  defaultImageUrl: 'https://img.example.com/default.png',
  imagePlaceholder: 'https://img.example.com/placeholder.png',
  imageUploadText: 'Unggah',
  imageNotAvailableText: 'Belum ada',
  imageFormatHint: 'PNG/JPG',
  onDeleteRequest: vi.fn(),
  deleteButtonLabel: 'Hapus Data',
  mode: 'edit' as const,
  initialNameFromSearch: 'Cari Nama',
  imageAspectRatio: 'square' as const,
  showImageUploader: true,
  useInlineFieldActions: true,
  ...overrides,
});

describe('useIdentityModalLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useIdentityFormMock.mockReset();
    formatDateTimeMock.mockReset();
    formatDateTimeMock.mockReturnValue('01 Februari 2026');

    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds context value and handleCloseModal behavior with focus restore', () => {
    const identityFormState = baseIdentityFormState();
    useIdentityFormMock.mockReturnValue(identityFormState);

    const props = makeProps();
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Cari data';
    const focusSpy = vi
      .spyOn(searchInput, 'focus')
      .mockImplementation(() => undefined);
    document.body.appendChild(searchInput);

    const { result } = renderHook(() => useIdentityModalLogic(props));

    expect(useIdentityFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialData: props.data,
        fields: props.fields,
        onSave: props.onSave,
        onFieldSave: props.onFieldSave,
        onImageSave: props.onImageSave,
        initialImageUrl: props.imageUrl,
        mode: props.mode,
        isOpen: props.isOpen,
        initialNameFromSearch: props.initialNameFromSearch,
        useInlineFieldActions: props.useInlineFieldActions,
      })
    );

    const wrappedOnImageDelete = useIdentityFormMock.mock.calls[0][0]
      .onImageDelete as (entityId?: string) => Promise<void>;
    void wrappedOnImageDelete('id-1');
    void wrappedOnImageDelete(undefined);
    expect(props.onImageDelete).toHaveBeenCalledWith('id-1');

    expect(formatDateTimeMock).toHaveBeenCalledWith('2026-02-01T08:00:00.000Z');
    expect(result.current.contextValue.formattedUpdateAt).toBe(
      '01 Februari 2026'
    );
    expect(result.current.contextValue.title).toBe('Modal Identitas');
    expect(result.current.contextValue.deleteButtonLabel).toBe('Hapus Data');
    expect(result.current.contextValue.currentImageUrl).toBe(
      'https://img.example.com/current.png'
    );

    act(() => {
      result.current.contextValue.handleCloseModal();
    });

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(result.current.resetInternalState).toBe(
      identityFormState.resetInternalState
    );
  });

  it('auto-focuses name input when open in add mode and name field exists', () => {
    useIdentityFormMock.mockReturnValue(baseIdentityFormState());

    const input = document.createElement('input');
    input.id = 'name';
    const focusSpy = vi
      .spyOn(input, 'focus')
      .mockImplementation(() => undefined);
    document.body.appendChild(input);

    renderHook(() =>
      useIdentityModalLogic(
        makeProps({
          mode: 'add',
          isOpen: true,
          fields: [
            {
              key: 'name',
              label: 'Nama Lengkap',
              type: 'text',
              editable: true,
            },
            {
              key: 'address',
              label: 'Alamat',
              type: 'textarea',
              editable: true,
            },
          ],
          data: { id: 'id-1', name: 'Awal', updated_at: null },
        })
      )
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});
