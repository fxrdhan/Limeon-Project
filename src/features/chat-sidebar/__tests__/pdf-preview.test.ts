import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import {
  renderPdfPreviewBlob,
  renderPdfPreviewDataUrl,
} from '../utils/pdf-preview';

const {
  mockGetContext,
  mockRender,
  mockDestroy,
  mockGetPage,
  mockGetDocument,
  mockGlobalWorkerOptions,
  mockToBlob,
  mockToDataUrl,
} = vi.hoisted(() => {
  const getContext = vi.fn(() => ({}));
  const toDataUrl = vi.fn(() => 'data:image/png;base64,preview');
  const toBlob = vi.fn((callback: BlobCallback) => {
    callback(new Blob(['preview'], { type: 'image/png' }));
  });
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const destroy = vi.fn(() => Promise.resolve());
  const getPage = vi.fn(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({
      width: 100 * scale,
      height: 140 * scale,
    }),
    render,
  }));
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 4,
      getPage,
      cleanup: vi.fn(),
    }),
    destroy,
  }));

  return {
    mockGetContext: getContext,
    mockRender: render,
    mockDestroy: destroy,
    mockGetPage: getPage,
    mockGetDocument: getDocument,
    mockGlobalWorkerOptions: { workerSrc: '' },
    mockToBlob: toBlob,
    mockToDataUrl: toDataUrl,
  };
});

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: mockGlobalWorkerOptions,
  getDocument: mockGetDocument,
}));

vi.mock('pdfjs-dist/legacy/build/pdf.worker.mjs?url', () => ({
  default: 'mock-worker.js',
}));

describe('pdf-preview utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalWorkerOptions.workerSrc = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'canvas') {
        const canvas = originalCreateElement('canvas');
        Object.defineProperty(canvas, 'getContext', {
          configurable: true,
          value: mockGetContext,
        });
        Object.defineProperty(canvas, 'toBlob', {
          configurable: true,
          value: mockToBlob,
        });
        Object.defineProperty(canvas, 'toDataURL', {
          configurable: true,
          value: mockToDataUrl,
        });
        return canvas;
      }

      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a PDF cover as data URL through the shared renderer', async () => {
    const preview = await renderPdfPreviewDataUrl(
      new File(['pdf'], 'stok.pdf', { type: 'application/pdf' }),
      260
    );

    expect(preview).toEqual({
      coverDataUrl: 'data:image/png;base64,preview',
      pageCount: 4,
    });
    expect(mockGlobalWorkerOptions.workerSrc).toBe('mock-worker.js');
    expect(mockGetDocument).toHaveBeenCalledOnce();
    expect(mockGetPage).toHaveBeenCalledWith(1);
    expect(mockRender).toHaveBeenCalledOnce();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it('renders a PDF cover as blob through the shared renderer', async () => {
    const preview = await renderPdfPreviewBlob(
      new File(['pdf'], 'stok.pdf', { type: 'application/pdf' }),
      260
    );

    expect(preview?.pageCount).toBe(4);
    expect(preview?.coverBlob).toBeInstanceOf(Blob);
    expect(preview?.coverBlob.type).toBe('image/png');
  });
});
