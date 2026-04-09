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

describe('ProgressiveImagePreview', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    imageDimensionsBySrc.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps rendering the immediate preview while the full image is still pending', async () => {
    const releaseFullImageRef: { current: null | (() => void) } = {
      current: null,
    };

    class SlowFullImage extends MockImage {
      set src(value: string) {
        if (value === 'https://example.com/full-image.jpg') {
          queueMicrotask(() => {
            releaseFullImageRef.current = () => {
              this.onload?.();
            };
          });
          return;
        }

        super.src = value;
      }
    }

    vi.stubGlobal('Image', SlowFullImage);

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

    if (releaseFullImageRef.current) {
      releaseFullImageRef.current();
    }
  });

  it('keeps the preview empty until the full image is decoded when the source starts as a single raw url', () => {
    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        backdropSrc="https://example.com/full-image.jpg"
      />
    );

    expect(screen.queryByAltText('Preview gambar')).toBeNull();
  });

  it('reveals the decoded full image once the full source is ready', async () => {
    render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
        'https://example.com/full-image.jpg'
      );
    });
  });

  it('keeps rendering the current preview while a new sizing source is still decoding', async () => {
    const { rerender } = render(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc={null}
        backdropSrc="data:image/webp;base64,preview"
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
        'data:image/webp;base64,preview'
      );
    });

    imageDimensionsBySrc.clear();

    rerender(
      <ProgressiveImagePreview
        alt="Preview gambar"
        fullSrc="https://example.com/full-image.jpg"
        frameSourceSrc="https://example.com/full-image.jpg"
        backdropSrc="data:image/webp;base64,preview"
      />
    );

    expect(screen.getByAltText('Preview gambar').getAttribute('src')).toBe(
      'data:image/webp;base64,preview'
    );
  });
});
