import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
  supabaseUrl: 'https://example.supabase.co',
}));

describe('chatLinkService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates a shared link through the chat-link edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        slug: 'abc123xyzt',
        shortUrl:
          'https://example.supabase.co/functions/v1/chat-link/abc123xyzt',
        storagePath: 'images/channel/image.png',
      },
      error: null,
    });

    const { chatLinkService } = await import('./link.service');

    const result = await chatLinkService.createSharedLink({
      storagePath: 'images/channel/image.png',
    });

    expect(mockInvoke).toHaveBeenCalledWith('chat-link', {
      body: {
        storagePath: 'images/channel/image.png',
      },
    });
    expect(result).toEqual({
      data: {
        slug: 'abc123xyzt',
        shortUrl:
          'https://example.supabase.co/functions/v1/chat-link/abc123xyzt',
        storagePath: 'images/channel/image.png',
      },
      error: null,
    });
  });

  it('surfaces edge function invocation errors', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        code: '401',
        details: '',
        hint: '',
        message: 'Unauthorized',
        name: 'FunctionsHttpError',
      },
    });

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
        name: 'FunctionsHttpError',
      },
    });
  });

  it('passes messageId to the edge function for attachment-linked requests', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        slug: 'msg123xyzt',
        shortUrl:
          'https://example.supabase.co/functions/v1/chat-link/msg123xyzt',
        storagePath: 'documents/channel/report.pdf',
      },
      error: null,
    });

    const { chatLinkService } = await import('./link.service');

    await chatLinkService.createSharedLink({
      messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
    });

    expect(mockInvoke).toHaveBeenCalledWith('chat-link', {
      body: {
        messageId: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      },
    });
  });
});
