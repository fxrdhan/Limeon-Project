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
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

describe('chatLinkService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a shared link through the chat link worker with the current auth token', async () => {
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
        JSON.stringify({
          slug: 'abc123xyzt',
          shortUrl: 'https://shrtlink.works/abc123xyzt',
          storagePath: 'images/channel/image.png',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { chatLinkService } = await import('./link.service');

    const result = await chatLinkService.createSharedLink(
      'images/channel/image.png'
    );

    expect(fetch).toHaveBeenCalledWith('https://shrtlink.works/api/chat-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer access-token-123',
      },
      body: JSON.stringify({
        storagePath: 'images/channel/image.png',
      }),
    });
    expect(result).toEqual({
      data: {
        slug: 'abc123xyzt',
        shortUrl: 'https://shrtlink.works/abc123xyzt',
        storagePath: 'images/channel/image.png',
      },
      error: null,
    });
  });

  it('returns a typed error when the auth session is missing', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    const { chatLinkService } = await import('./link.service');

    const result = await chatLinkService.createSharedLink(
      'images/channel/image.png'
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

  it('surfaces upstream worker errors', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token-123',
        },
      },
      error: null,
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { chatLinkService } = await import('./link.service');

    const result = await chatLinkService.createSharedLink(
      'images/channel/image.png'
    );

    expect(result).toEqual({
      data: null,
      error: {
        code: '401',
        details: '',
        hint: '',
        message: 'Unauthorized',
        name: 'PostgrestError',
      },
    });
  });
});
