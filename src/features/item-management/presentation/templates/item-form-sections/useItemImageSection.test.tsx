import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useItemImageSection } from './useItemImageSection';

const {
  mockCacheImageBlob,
  mockGetImageDimensions,
  mockGetCachedImageBlobUrl,
  mockPreloadImages,
  mockReleaseCachedImageBlobs,
  mockRemoveCachedImageBlob,
  mockRemoveCachedImageSet,
  mockSetCachedImageSet,
} = vi.hoisted(() => ({
  mockCacheImageBlob: vi.fn(),
  mockGetImageDimensions: vi.fn(),
  mockGetCachedImageBlobUrl: vi.fn(),
  mockPreloadImages: vi.fn(),
  mockReleaseCachedImageBlobs: vi.fn(),
  mockRemoveCachedImageBlob: vi.fn(),
  mockRemoveCachedImageSet: vi.fn(),
  mockSetCachedImageSet: vi.fn(),
}));

vi.mock('./item-image-section/imageDimensions', () => ({
  getImageDimensions: mockGetImageDimensions,
}));

vi.mock('@/utils/imageCache', () => ({
  cacheImageBlob: mockCacheImageBlob,
  getCachedImageBlobUrl: mockGetCachedImageBlobUrl,
  preloadImages: mockPreloadImages,
  releaseCachedImageBlobs: mockReleaseCachedImageBlobs,
  removeCachedImageBlob: mockRemoveCachedImageBlob,
  removeCachedImageSet: mockRemoveCachedImageSet,
  setCachedImageSet: mockSetCachedImageSet,
}));

const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL'
);
const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL'
);

const createDeferred = <T,>() => {
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

describe('useItemImageSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetImageDimensions.mockResolvedValue({ width: 1200, height: 800 });
    mockCacheImageBlob.mockResolvedValue(null);
    mockGetCachedImageBlobUrl.mockResolvedValue(null);
    mockRemoveCachedImageBlob.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (createObjectUrlDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('revokes stale crop preview URLs when replacing or unmounting the cropper', async () => {
    const createObjectUrl = vi
      .fn()
      .mockReturnValueOnce('blob:first-crop')
      .mockReturnValueOnce('blob:second-crop');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });

    const { result, unmount } = renderHook(() =>
      useItemImageSection({
        isEditMode: false,
        loading: false,
        formImageUrls: [],
        updateFormData: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['first'], 'first.png', { type: 'image/png' })
      );
    });

    await waitFor(() => {
      expect(result.current.cropState?.previewUrl).toBe('blob:first-crop');
    });

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['second'], 'second.png', { type: 'image/png' })
      );
    });

    await waitFor(() => {
      expect(result.current.cropState?.previewUrl).toBe('blob:second-crop');
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-crop');

    unmount();

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second-crop');
  });

  it('ignores a stale image dimension result after a newer upload fills the same slot', async () => {
    const firstDimensions = createDeferred<{ width: number; height: number }>();
    mockGetImageDimensions
      .mockReset()
      .mockReturnValueOnce(firstDimensions.promise)
      .mockResolvedValueOnce({ width: 512, height: 512 });
    const secondFile = new File(['second'], 'second.png', {
      type: 'image/png',
    });
    const createObjectUrl = vi.fn().mockReturnValue('blob:second-upload');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const { result } = renderHook(() =>
      useItemImageSection({
        isEditMode: false,
        loading: false,
        formImageUrls: [],
        updateFormData: vi.fn(),
      })
    );

    let firstUploadPromise: Promise<void>;
    act(() => {
      firstUploadPromise = result.current.handleImageUpload(
        0,
        new File(['first'], 'first.png', { type: 'image/png' })
      );
    });

    await act(async () => {
      await result.current.handleImageUpload(0, secondFile);
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:second-upload');

    await act(async () => {
      firstDimensions.resolve({ width: 512, height: 512 });
      await firstUploadPromise;
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:second-upload');
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(createObjectUrl).toHaveBeenCalledWith(secondFile);
  });

  it('ignores a stale crop result after a newer upload fills the same slot', async () => {
    const cropResult = createDeferred<Blob>();
    mockGetImageDimensions
      .mockReset()
      .mockResolvedValueOnce({ width: 1200, height: 800 })
      .mockResolvedValueOnce({ width: 512, height: 512 });
    const createObjectUrl = vi
      .fn()
      .mockReturnValueOnce('blob:crop-source')
      .mockReturnValueOnce('blob:new-upload')
      .mockReturnValue('blob:stale-crop');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const { result } = renderHook(() =>
      useItemImageSection({
        isEditMode: false,
        loading: false,
        formImageUrls: [],
        updateFormData: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['first'], 'first.png', { type: 'image/png' })
      );
    });

    result.current.imageCropperRef.current = {
      toBlob: vi.fn(() => cropResult.promise),
    };

    let cropConfirmPromise: Promise<void>;
    act(() => {
      cropConfirmPromise = result.current.handleCropConfirm();
    });

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['new'], 'new.png', { type: 'image/png' })
      );
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:new-upload');

    await act(async () => {
      cropResult.resolve(new Blob(['cropped'], { type: 'image/png' }));
      await cropConfirmPromise;
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:new-upload');
    expect(result.current.isCropping).toBe(false);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
  });

  it('does not clear a slot that was refilled while an older delete was pending', async () => {
    const deleteCache = createDeferred<void>();
    mockGetImageDimensions.mockResolvedValue({ width: 512, height: 512 });
    mockRemoveCachedImageBlob.mockReturnValueOnce(deleteCache.promise);
    const createObjectUrl = vi
      .fn()
      .mockReturnValueOnce('blob:old-upload')
      .mockReturnValueOnce('blob:new-upload');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const { result } = renderHook(() =>
      useItemImageSection({
        isEditMode: false,
        loading: false,
        formImageUrls: [],
        updateFormData: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['old'], 'old.png', { type: 'image/png' })
      );
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:old-upload');

    let deletePromise: Promise<void>;
    act(() => {
      deletePromise = result.current.handleImageDelete(0);
    });

    await act(async () => {
      await result.current.handleImageUpload(
        0,
        new File(['new'], 'new.png', { type: 'image/png' })
      );
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:new-upload');

    await act(async () => {
      deleteCache.resolve();
      await deletePromise;
    });

    expect(result.current.imageSlots[0]?.url).toBe('blob:new-upload');
  });
});
