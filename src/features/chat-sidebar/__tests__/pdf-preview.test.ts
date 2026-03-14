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
  mockCanvas,
  mockRender,
  mockGetPage,
  mockGetDocument,
  mockGlobalWorkerOptions,
} = vi.hoisted(() => {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({})),
    toDataURL: vi.fn(() => 'data:image/png;base64,preview'),
    toBlob: vi.fn((callback: BlobCallback) => {
      callback(new Blob(['preview'], { type: 'image/png' }));
    }),
  };

  const render = vi.fn(() => ({ promise: Promise.resolve() }));
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
      destroy: vi.fn(),
    }),
  }));

  return {
    mockCanvas: canvas,
    mockRender: render,
    mockGetPage: getPage,
    mockGetDocument: getDocument,
    mockGlobalWorkerOptions: { workerSrc: '' },
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
    mockCanvas.width = 0;
    mockCanvas.height = 0;
    mockGlobalWorkerOptions.workerSrc = '';
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
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
