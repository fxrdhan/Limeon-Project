import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseUrl: 'https://project-ref.supabase.co',
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

describe('chatPdfCompressService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('compresses a PDF through the edge function with the current auth token', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token-123',
        },
      },
      error: null,
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response('compressed-pdf', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Chat-Pdf-Compress-File-Name': 'stok_compressed.pdf',
          'X-Chat-Pdf-Compress-Original-Size': '2048',
          'X-Chat-Pdf-Compress-Compressed-Size': '1024',
        },
      })
    );

    const { chatPdfCompressService } = await import('./pdf-compress.service');
    const sourceFile = new File(['source-pdf'], 'stok.pdf', {
      type: 'application/pdf',
    });

    const result = await chatPdfCompressService.compressPdf(sourceFile);

    expect(fetch).toHaveBeenCalledWith(
      'https://project-ref.supabase.co/functions/v1/chat-pdf-compress',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token-123',
        },
        body: expect.any(FormData),
      })
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      file: expect.any(File),
      originalSize: 2048,
      compressedSize: 1024,
    });
    expect(result.data?.file.name).toBe('stok_compressed.pdf');
    expect(result.data?.file.type).toBe('application/pdf');
  });

  it('returns a typed error when the auth session is missing', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    const { chatPdfCompressService } = await import('./pdf-compress.service');

    const result = await chatPdfCompressService.compressPdf(
      new File(['source-pdf'], 'stok.pdf', {
        type: 'application/pdf',
      })
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: null,
      error: {
        code: '401',
        details: '',
        hint: '',
        message: 'Missing auth session',
        name: 'PostgrestError',
      },
    });
  });

  it('surfaces upstream edge function errors', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token-123',
        },
      },
      error: null,
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Ukuran PDF maksimal 50 MB untuk kompres' }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { chatPdfCompressService } = await import('./pdf-compress.service');

    const result = await chatPdfCompressService.compressPdf(
      new File(['source-pdf'], 'stok.pdf', {
        type: 'application/pdf',
      })
    );

    expect(result).toEqual({
      data: null,
      error: {
        code: '413',
        details: '',
        hint: '',
        message: 'Ukuran PDF maksimal 50 MB untuk kompres',
        name: 'PostgrestError',
      },
    });
  });
});
