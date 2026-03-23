import { render, screen, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import ProgressiveImagePreview from '../components/ProgressiveImagePreview';

const imageDimensionsBySrc = new Map<
  string,
  { width: number; height: number }
>();

class MockImage {
  decoding = 'async';
  naturalWidth = 1200;
  naturalHeight = 800;
  width = 1200;
  height = 800;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = '';

  set src(value: string) {
    this.#src = value;
    const dimensions = imageDimensionsBySrc.get(value);
    if (dimensions) {
      this.naturalWidth = dimensions.width;
      this.width = dimensions.width;
      this.naturalHeight = dimensions.height;
      this.height = dimensions.height;
    }
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  get src() {
    return this.#src;
  }

  decode() {
    return Promise.resolve();
  }
}

class MockResizeObserver {
  #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe() {
    this.#callback(
      [
        {
          contentRect: {
            width: 1200,
            height: 820,
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }

  disconnect() {}
}

const flushMicrotasks = async (count = 6) => {
  for (let index = 0; index < count; index += 1) {
    await Promise.resolve();
  }
};

describe('ProgressiveImagePreview', () => {
  const originalGetContextDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext'
  );
  const originalToBlobDescriptor = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'toBlob'
  );

  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    imageDimensionsBySrc.clear();
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
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps rendering the immediate preview while the full image pipeline is still pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        backdropSrc="data:image/webp;base64,preview"
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
        'data:image/webp;base64,preview'
      );
    });
    expect(
      document.querySelector('img[src="https://example.com/full-image.jpg"]')
    ).toBeNull();
  });

  it('keeps the preview empty until a generated stage is ready when the source starts as a single raw url', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        backdropSrc="https://example.com/full-image.jpg"
      />
    );

    expect(screen.queryByAltText('Preview gambar')).toBeNull();
    expect(
      document.querySelector('img[src="https://example.com/full-image.jpg"]')
    ).toBeNull();
  });

  it('reveals the decoded full image only after the staged layers are prepared', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        blob: async () => new Blob(['full-image'], { type: 'image/jpeg' }),
      }))
    );
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:full-stage')
      .mockReturnValueOnce('blob:half-stage')
      .mockReturnValueOnce('blob:three-quarter-stage');
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(
        () =>
          ({
            drawImage: vi.fn(),
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
          }) as unknown as CanvasRenderingContext2D
      ),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn(
        (callback: BlobCallback, _type?: string, _quality?: number) => {
          callback(new Blob(['stage'], { type: 'image/webp' }));
        }
      ),
    });

    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
        'blob:half-stage'
      );
    });

    await flushMicrotasks(2);

    await waitFor(
      () => {
        expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
          'blob:full-stage'
        );
      },
      { timeout: 1000 }
    );
  });

  it('renders the active stage inside a contained frame derived from the decoded image dimensions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        backdropSrc="data:image/webp;base64,preview"
        className="h-[480px] w-[720px]"
        imageClassName="h-full w-full rounded-xl"
      />
    );

    const imageElement = await screen.findByAltText('Preview gambar');
    const expectedWidth = Math.round(window.innerWidth * 0.92);
    const expectedHeight = Math.round((800 / 1200) * expectedWidth);

    await waitFor(() => {
      expect(imageElement.parentElement?.getAttribute('style')).toContain(
        `width: ${expectedWidth}px`
      );
      expect(imageElement.parentElement?.getAttribute('style')).toContain(
        `height: ${expectedHeight}px`
      );
    });
    expect(imageElement.className).toContain('object-contain');
  });

  it('prefers the full preview as the sizing source when frameSourceSrc is provided', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );
    imageDimensionsBySrc.set('data:image/webp;base64,preview', {
      width: 800,
      height: 800,
    });
    imageDimensionsBySrc.set('https://example.com/full-image.jpg', {
      width: 800,
      height: 1200,
    });

    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        frameSourceSrc="https://example.com/full-image.jpg"
        backdropSrc="data:image/webp;base64,preview"
      />
    );

    const imageElement = await screen.findByAltText('Preview gambar');
    const expectedHeight = Math.round(window.innerHeight * 0.92);
    const expectedWidth = Math.round((800 / 1200) * expectedHeight);

    await waitFor(() => {
      expect(imageElement.parentElement?.getAttribute('style')).toContain(
        `width: ${expectedWidth}px`
      );
      expect(imageElement.parentElement?.getAttribute('style')).toContain(
        `height: ${expectedHeight}px`
      );
    });
  });
});
