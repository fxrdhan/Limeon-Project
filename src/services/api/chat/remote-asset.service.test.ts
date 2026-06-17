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
}));

describe('chatRemoteAssetService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fetches a remote asset through the edge function', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    const response = new Response(blob, {
      headers: {
        'Content-Disposition': 'inline; filename="image.png"',
        'X-Chat-Remote-Content-Type': 'image/png',
        'X-Chat-Remote-File-Name': 'image.png',
        'X-Chat-Remote-Source-Url': 'https://example.com/image.png',
      },
    });
    mockInvoke.mockResolvedValue({
      data: blob,
      error: null,
      response,
    });

    const { chatRemoteAssetService } = await import('./remote-asset.service');

    const result = await chatRemoteAssetService.fetchRemoteAsset(
      'https://example.com/image.png',
      { fileNameSourceUrl: 'https://example.com/page' }
    );

    expect(mockInvoke).toHaveBeenCalledWith('chat-remote-asset', {
      body: {
        url: 'https://example.com/image.png',
        fileNameSourceUrl: 'https://example.com/page',
      },
    });
    expect(result).toEqual({
      data: {
        blob,
        contentDisposition: 'inline; filename="image.png"',
        contentType: 'image/png',
        fileNameHint: 'image.png',
        sourceUrl: 'https://example.com/image.png',
      },
      error: null,
    });
  });

  it('surfaces edge function invocation errors', async () => {
    const error = {
      code: '403',
      details: '',
      hint: '',
      message: 'Forbidden',
      name: 'FunctionsHttpError',
    };
    mockInvoke.mockResolvedValue({
      data: null,
      error,
      response: new Response(null, { status: 403 }),
    });

    const { chatRemoteAssetService } = await import('./remote-asset.service');

    await expect(
      chatRemoteAssetService.fetchRemoteAsset('https://example.com/image.png')
    ).resolves.toEqual({
      data: null,
      error,
    });
  });

  it('returns a typed error when the edge function payload is not a blob', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
      response: new Response(JSON.stringify({ ok: true })),
    });

    const { chatRemoteAssetService } = await import('./remote-asset.service');

    const result = await chatRemoteAssetService.fetchRemoteAsset(
      'https://example.com/image.png'
    );

    expect(result).toEqual({
      data: null,
      error: {
        code: 'CHAT_REMOTE_ASSET_INVALID_RESPONSE',
        details: '',
        hint: '',
        message: 'Invalid chat remote asset response',
        name: 'PostgrestError',
      },
    });
  });

  it('preserves thrown edge function errors without PostgREST casting', async () => {
    const error = new Error('Function network failed');
    mockInvoke.mockRejectedValue(error);

    const { chatRemoteAssetService } = await import('./remote-asset.service');

    await expect(
      chatRemoteAssetService.fetchRemoteAsset('https://example.com/image.png')
    ).resolves.toEqual({
      data: null,
      error,
    });
  });
});
