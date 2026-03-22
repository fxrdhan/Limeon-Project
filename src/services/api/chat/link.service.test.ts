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

    const result = await chatLinkService.createSharedLink({
      storagePath: 'images/channel/image.png',
    });

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
        targetUrl: null,
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

    const result = await chatLinkService.createSharedLink({
      storagePath: 'images/channel/image.png',
    });

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

    const result = await chatLinkService.createSharedLink({
      storagePath: 'images/channel/image.png',
    });

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

  it('creates a shared link for a generic target url', async () => {
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
          slug: 'link234xyz',
          shortUrl: 'https://shrtlink.works/link234xyz',
          targetUrl: 'https://www.kaggle.com/datasets/sample',
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

    const result = await chatLinkService.createSharedLink({
      targetUrl: 'https://www.kaggle.com/datasets/sample',
    });

    expect(fetch).toHaveBeenCalledWith('https://shrtlink.works/api/chat-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer access-token-123',
      },
      body: JSON.stringify({
        targetUrl: 'https://www.kaggle.com/datasets/sample',
      }),
    });
    expect(result).toEqual({
      data: {
        slug: 'link234xyz',
        shortUrl: 'https://shrtlink.works/link234xyz',
        storagePath: null,
        targetUrl: 'https://www.kaggle.com/datasets/sample',
      },
      error: null,
    });
  });

  it('passes messageId to the chat link worker for attachment-linked requests', async () => {
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
          slug: 'msg123xyzt',
          shortUrl: 'https://shrtlink.works/msg123xyzt',
          storagePath: 'documents/channel/report.pdf',
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

    await chatLinkService.createSharedLink({
      messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
    });

    expect(fetch).toHaveBeenCalledWith('https://shrtlink.works/api/chat-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer access-token-123',
      },
      body: JSON.stringify({
        messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      }),
    });
  });
});
