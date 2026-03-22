import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createImagePreviewUploadArtifact } from '../utils/image-message-preview';

class MockImage {
  naturalWidth = 3072;
  naturalHeight = 5504;
  width = 3072;
  height = 5504;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  get src() {
    return this.#src;
  }
}

describe('image-message-preview', () => {
  const originalGetContextDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext'
  );
  const originalToBlobDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'toBlob'
  );
  const originalToDataUrlDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'toDataURL'
  );

  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source-image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalGetContextDescriptor) {
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'getContext',
        originalGetContextDescriptor
      );
    }
    if (originalToBlobDescriptor) {
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'toBlob',
        originalToBlobDescriptor
      );
    }
    if (originalToDataUrlDescriptor) {
      Object.defineProperty(
        HTMLCanvasElement.prototype,
        'toDataURL',
        originalToDataUrlDescriptor
      );
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates an aspect-preserving preview artifact and versions the preview path', async () => {
    const drawImage = vi.fn();

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(
        () =>
          ({
            drawImage,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
          }) as unknown as CanvasRenderingContext2D
      ),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['preview'], { type: 'image/webp' }));
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/webp;base64,preview'),
    });

    const result = await createImagePreviewUploadArtifact(
      new Blob(['image'], { type: 'image/png' }),
      'images/channel/portrait.png'
    );

    expect(result?.previewPath).toBe('previews/channel/portrait.fit-v2.webp');
    expect(result?.previewDataUrl).toBe('data:image/webp;base64,preview');
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0]?.slice(1)).toEqual([0, 0, 357, 640]);
  });
});
