import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useIdentityModalLogic } from './useIdentityModalLogic';

const { focusEditableIdentityFieldMock, focusIdentitySearchInputMock } =
  vi.hoisted(() => ({
    focusEditableIdentityFieldMock: vi.fn(),
    focusIdentitySearchInputMock: vi.fn(),
  }));

vi.mock('../focus', () => ({
  focusEditableIdentityField: focusEditableIdentityFieldMock,
  focusIdentitySearchInput: focusIdentitySearchInputMock,
}));

vi.mock('./identityForm', () => ({
  useIdentityForm: () => ({
    currentImageUrl: null,
    editMode: { name: true },
    editValues: {},
    handleCancelEdit: vi.fn(),
    handleChange: vi.fn(),
    handleImageDeleteInternal: vi.fn(),
    handleImageUpload: vi.fn(),
    handleSaveAll: vi.fn(),
    handleSaveField: vi.fn(),
    isDirty: false,
    isSubmitting: false,
    isUploadingImage: false,
    loadingField: null,
    localData: {},
    pendingImageDelete: false,
    resetInternalState: vi.fn(),
    setInputRef: vi.fn(),
    toggleEdit: vi.fn(),
  }),
}));

const baseProps = {
  data: {},
  fields: [{ key: 'name', label: 'Nama' }],
  isOpen: true,
  onClose: vi.fn(),
  title: 'Supplier',
};

describe('useIdentityModalLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    focusEditableIdentityFieldMock.mockClear();
    focusIdentitySearchInputMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('focuses the name field after the open delay', () => {
    renderHook(() =>
      useIdentityModalLogic({
        ...baseProps,
        mode: 'add',
      })
    );

    expect(focusEditableIdentityFieldMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(focusEditableIdentityFieldMock).toHaveBeenCalledWith('name');
  });

  it('cancels pending name autofocus when the modal closes before the delay', () => {
    const { rerender } = renderHook(
      ({ isOpen }) =>
        useIdentityModalLogic({
          ...baseProps,
          isOpen,
          mode: 'add',
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    rerender({ isOpen: false });
    vi.advanceTimersByTime(100);

    expect(focusEditableIdentityFieldMock).not.toHaveBeenCalled();
  });

  it('cancels pending name autofocus when the modal close action runs', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useIdentityModalLogic({
        ...baseProps,
        mode: 'add',
        onClose,
      })
    );

    act(() => {
      result.current.contextValue.handleCloseModal();
    });
    vi.advanceTimersByTime(100);

    expect(onClose).toHaveBeenCalledOnce();
    expect(focusEditableIdentityFieldMock).not.toHaveBeenCalled();
  });

  it('cancels pending search focus when the modal reopens before the close frame runs', () => {
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(frameId => {
        queuedFrames.delete(frameId);
      });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    });
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) =>
        useIdentityModalLogic({
          ...baseProps,
          isOpen,
          mode: 'add',
          onClose,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    act(() => {
      result.current.contextValue.handleCloseModal();
    });

    const searchFocusFrameId = nextFrameId - 1;
    expect(queuedFrames.has(searchFocusFrameId)).toBe(true);

    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(searchFocusFrameId);

    act(() => {
      for (const [frameId, callback] of queuedFrames) {
        callback(frameId);
      }
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(focusIdentitySearchInputMock).not.toHaveBeenCalled();
  });
});
