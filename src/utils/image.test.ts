import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImageIfNeeded } from './image';

const imageCompressionMock = vi.hoisted(() => vi.fn());
let compressorShouldFail = false;
let compressorResult: File | Blob | null = null;
const originalFile = globalThis.File;

vi.mock('browser-image-compression', () => ({
  default: imageCompressionMock,
}));

vi.mock('compressorjs', () => ({
  default: class CompressorMock {
    constructor(
      file: File,
      options: {
        success?: (value: File | Blob) => void;
        error?: (err: Error) => void;
      }
    ) {
      if (compressorShouldFail) {
        options.error?.(new Error('compress failed'));
        return;
      }
      const result = compressorResult ?? file;
      options.success?.(result);
    }
  },
}));

describe('image compression', () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalImage = global.Image;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    compressorShouldFail = false;
    compressorResult = null;
    imageCompressionMock.mockReset();

    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      width = 2000;
      height = 1000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    // @ts-expect-error override for test
    global.Image = MockImage;

    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (blob: Blob | null) => void) => {
            cb(new Blob([new Uint8Array(100)], { type: 'image/jpeg' }));
          },
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    global.Image = originalImage;
    // Restore File in case a test overrides it for instanceof checks.
    globalThis.File = originalFile;
    vi.restoreAllMocks();
  });

  it('returns original file when under size limit', async () => {
    const file = new File([new Uint8Array(10)], 'small.jpg', {
      type: 'image/jpeg',
    });

    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it('falls back to canvas when browser compression fails (png)', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));

    const result = await compressImageIfNeeded(file);
    expect(result).not.toBe(file);
    expect(result).toBeInstanceOf(File);
  });

  it('retries browser compression with smaller size', async () => {
    const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const firstAttempt = new File(
      [new Uint8Array(2 * 1024 * 1024)],
      'big.jpg',
      {
        type: 'image/jpeg',
      }
    );
    const secondAttempt = new File([new Uint8Array(100)], 'small.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock
      .mockResolvedValueOnce(firstAttempt)
      .mockResolvedValueOnce(secondAttempt);

    const result = await compressImageIfNeeded(bigFile);
    expect(result).toBe(secondAttempt);
  });

  it('returns early when browser compression is already small', async () => {
    const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const smallAttempt = new File([new Uint8Array(100)], 'small.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockResolvedValueOnce(smallAttempt);

    const result = await compressImageIfNeeded(bigFile);
    expect(result).toBe(smallAttempt);
    expect(imageCompressionMock).toHaveBeenCalledTimes(1);
  });

  it('uses webp output type for webp files', async () => {
    const webpFile = new File([new Uint8Array(2 * 1024 * 1024)], 'big.webp', {
      type: 'image/webp',
    });
    const smallAttempt = new File([new Uint8Array(100)], 'small.webp', {
      type: 'image/webp',
    });

    imageCompressionMock.mockResolvedValueOnce(smallAttempt);

    const result = await compressImageIfNeeded(webpFile);
    expect(result).toBe(smallAttempt);
    const options = imageCompressionMock.mock.calls[0]?.[1];
    expect(options.fileType).toBe('image/webp');
  });

  it('returns blob results from browser compression', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    imageCompressionMock.mockResolvedValueOnce(
      new Blob([new Uint8Array(100)], { type: 'image/jpeg' })
    );

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(Blob);
    expect(result).not.toBeInstanceOf(File);
  });

  it('wraps compressor blob results into files', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const blob = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorResult = blob;

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(File);
  });

  it('uses compressor file results directly', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });
    const compressedFile = new File([new Uint8Array(100)], 'small.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorResult = compressedFile;

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(File);
    const resultFile = result as File;
    expect(resultFile.name).toBe(compressedFile.name);
    expect(resultFile.type).toBe(compressedFile.type);
    expect(resultFile.size).toBe(compressedFile.size);
  });

  it('handles compressor errors before falling back', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(File);
  });

  it('handles canvas ratio fallback when image dimensions are infinite', async () => {
    class HugeImage {
      width = Number.POSITIVE_INFINITY;
      height = Number.POSITIVE_INFINITY;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }
    // @ts-expect-error override for test
    global.Image = HugeImage;

    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(File);
  });

  it('falls back after compressor errors', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBeInstanceOf(File);
  });

  it('returns original file after all attempts fail', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    // Force canvas failure by returning null context
    (
      document.createElement as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return {
          getContext: () => null,
          toBlob: () => undefined,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it('handles image load errors and canvas failures', async () => {
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    // @ts-expect-error override for test
    global.Image = ErrorImage;

    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it('handles canvas toBlob null and retry exhaustion', async () => {
    (
      document.createElement as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob: (cb: (blob: Blob | null) => void) => cb(null),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it('exhausts canvas retries on large blobs', async () => {
    (
      document.createElement as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob: (cb: (blob: Blob | null) => void) =>
            cb(
              new Blob([new Uint8Array(2 * 1024 * 1024)], {
                type: 'image/jpeg',
              })
            ),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });

    imageCompressionMock.mockRejectedValueOnce(new Error('fail'));
    compressorShouldFail = true;

    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });
});
