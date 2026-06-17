import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useImageGroupPreview } from '../hooks/messages-pane-image-previews/useImageGroupPreview';
import { useSingleImagePreview } from '../hooks/messages-pane-image-previews/useSingleImagePreview';
import type { ResolvedPreviewResource } from '../utils/message-preview-assets';

const { mockEnsureChannelImageAssetUrl, mockGetRuntimeChannelImageAssetUrl } =
  vi.hoisted(() => ({
    mockEnsureChannelImageAssetUrl: vi.fn(),
    mockGetRuntimeChannelImageAssetUrl: vi.fn(),
  }));

const { revokeObjectUrlMock } = vi.hoisted(() => ({
  revokeObjectUrlMock: vi.fn(),
}));

vi.mock('../utils/chatRuntime', () => ({
  chatRuntime: {
    imageAssets: {
      ensureUrl: mockEnsureChannelImageAssetUrl,
      getUrl: mockGetRuntimeChannelImageAssetUrl,
    },
  },
}));

const createDeferredPreviewResource = () => {
  let resolvePreview: ((value: ResolvedPreviewResource) => void) | undefined;
  const promise = new Promise<ResolvedPreviewResource>(resolve => {
    resolvePreview = resolve;
  });

  return {
    promise,
    resolve: (value: ResolvedPreviewResource) => {
      resolvePreview?.(value);
    },
  };
};

describe('message image preview stale requests', () => {
  const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
    URL,
    'revokeObjectURL'
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureChannelImageAssetUrl.mockResolvedValue(null);
    mockGetRuntimeChannelImageAssetUrl.mockReturnValue(null);
    revokeObjectUrlMock.mockReset();
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('does not let a slower single-image preview overwrite the latest preview', async () => {
    const deferredPreview = createDeferredPreviewResource();
    const resolveImagePreviewResource = vi
      .fn()
      .mockReturnValue(deferredPreview.promise);
    const { result } = renderHook(() =>
      useSingleImagePreview({
        currentChannelId: null,
        resolveImagePreviewResource,
      })
    );

    let staleOpenPromise: Promise<void>;
    act(() => {
      staleOpenPromise = result.current.openImageInPortal(
        {
          file_mime_type: 'image/png',
          file_preview_url: null,
          file_storage_path: 'images/old.png',
          id: 'old-image',
          message: 'images/old.png',
        },
        'Old image'
      );
    });

    await act(async () => {
      await result.current.openImageInPortal(
        {
          file_mime_type: 'image/png',
          file_preview_url: null,
          file_storage_path: 'images/new.png',
          id: 'new-image',
          message: 'images/new.png',
        },
        'New image',
        'blob:new-preview'
      );
    });

    expect(result.current.imagePreviewUrl).toBe('blob:new-preview');

    await act(async () => {
      deferredPreview.resolve({
        previewUrl: 'blob:old-preview',
        revokeOnClose: true,
      });
      await staleOpenPromise!;
    });

    expect(result.current.imagePreviewUrl).toBe('blob:new-preview');
    expect(result.current.imagePreviewName).toBe('New image');
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:old-preview');
  });

  it('does not let a slower grouped preview overwrite the latest preview group', async () => {
    const deferredPreview = createDeferredPreviewResource();
    const resolveImagePreviewResource = vi
      .fn()
      .mockReturnValue(deferredPreview.promise);
    const { result } = renderHook(() =>
      useImageGroupPreview({
        currentChannelId: null,
        resolveImagePreviewResource,
      })
    );

    let staleOpenPromise: Promise<void>;
    act(() => {
      staleOpenPromise = result.current.openImageGroupInPortal([
        {
          file_mime_type: 'image/png',
          file_name: 'Old.png',
          file_preview_url: null,
          file_storage_path: 'images/old.png',
          id: 'old-image',
          message: 'images/old.png',
        },
      ]);
    });

    await act(async () => {
      await result.current.openImageGroupInPortal(
        [
          {
            file_mime_type: 'image/png',
            file_name: 'New.png',
            file_preview_url: null,
            file_storage_path: 'images/new.png',
            id: 'new-image',
            message: 'images/new.png',
          },
        ],
        'new-image',
        'blob:new-preview'
      );
    });

    expect(result.current.activeImageGroupPreviewId).toBe('new-image');
    expect(result.current.imageGroupPreviewItems).toHaveLength(1);
    expect(result.current.imageGroupPreviewItems[0]?.id).toBe('new-image');

    await act(async () => {
      deferredPreview.resolve({
        previewUrl: 'blob:old-preview',
        revokeOnClose: true,
      });
      await staleOpenPromise!;
    });

    expect(result.current.activeImageGroupPreviewId).toBe('new-image');
    expect(result.current.imageGroupPreviewItems).toHaveLength(1);
    expect(result.current.imageGroupPreviewItems[0]?.id).toBe('new-image');
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:old-preview');
  });

  it('does not let a slower grouped item selection overwrite the latest selected item', async () => {
    const deferredPreview = createDeferredPreviewResource();
    const resolveImagePreviewResource = vi.fn(message => {
      if (message.id === 'image-a') {
        return deferredPreview.promise;
      }

      return Promise.resolve({
        previewUrl: 'blob:image-b-preview',
        revokeOnClose: false,
      } satisfies ResolvedPreviewResource);
    });
    const { result } = renderHook(() =>
      useImageGroupPreview({
        currentChannelId: null,
        resolveImagePreviewResource,
      })
    );

    await act(async () => {
      await result.current.openImageGroupInPortal(
        [
          {
            file_mime_type: 'image/png',
            file_name: 'A.png',
            file_preview_url: null,
            file_storage_path: 'images/a.png',
            id: 'image-a',
            message: 'images/a.png',
          },
          {
            file_mime_type: 'image/png',
            file_name: 'B.png',
            file_preview_url: null,
            file_storage_path: 'images/b.png',
            id: 'image-b',
            message: 'images/b.png',
          },
        ],
        'image-b',
        'blob:image-b-seed'
      );
    });

    act(() => {
      result.current.selectImageGroupPreviewItem('image-a');
    });

    expect(result.current.activeImageGroupPreviewId).toBe('image-a');

    act(() => {
      result.current.selectImageGroupPreviewItem('image-b');
    });

    expect(result.current.activeImageGroupPreviewId).toBe('image-b');

    await act(async () => {
      deferredPreview.resolve({
        previewUrl: 'blob:image-a-preview',
        revokeOnClose: true,
      });
      await deferredPreview.promise;
    });

    expect(result.current.activeImageGroupPreviewId).toBe('image-b');
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:image-a-preview');
  });
});
