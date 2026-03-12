import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageImagePreviews } from '../hooks/useMessageImagePreviews';
import type { ChatMessage } from '../data/chatSidebarGateway';

const { mockResolveChatAssetUrlWithExpiry, mockFetchChatFileBlobWithFallback } =
  vi.hoisted(() => ({
    mockResolveChatAssetUrlWithExpiry: vi.fn(),
    mockFetchChatFileBlobWithFallback: vi.fn(),
  }));

vi.mock('../utils/message-file', async importOriginal => {
  const actual = await importOriginal<typeof import('../utils/message-file')>();

  return {
    ...actual,
    fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
    isDirectChatAssetUrl: (url: string) =>
      /^(https?:\/\/|blob:|data:|\/)/i.test(url),
    resolveChatAssetUrlWithExpiry: mockResolveChatAssetUrlWithExpiry,
  };
});

describe('useMessageImagePreviews', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T10:00:00.000Z'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockResolveChatAssetUrlWithExpiry.mockReset();
    mockFetchChatFileBlobWithFallback.mockReset();
    mockFetchChatFileBlobWithFallback.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes signed image urls before they expire in long-lived sessions', async () => {
    mockResolveChatAssetUrlWithExpiry
      .mockResolvedValueOnce({
        url: 'https://example.com/signed-image-1',
        expiresAt: Date.now() + 90_000,
      })
      .mockResolvedValueOnce({
        url: 'https://example.com/signed-image-2',
        expiresAt: Date.now() + 90_000,
      });

    const messages: ChatMessage[] = [
      {
        id: 'image-1',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        channel_id: 'dm_user-a_user-b',
        message: 'images/channel/image-1.png',
        created_at: '2026-03-10T10:00:00.000Z',
        updated_at: '2026-03-10T10:00:00.000Z',
        is_read: false,
        message_type: 'image',
        file_storage_path: 'images/channel/user-a_image-1.png',
      },
    ];

    const { result } = renderHook(() => useMessageImagePreviews({ messages }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.getImageMessageUrl(messages[0]!)).toBe(
      'https://example.com/signed-image-1'
    );
    expect(mockResolveChatAssetUrlWithExpiry).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.getImageMessageUrl(messages[0]!)).toBe(
      'https://example.com/signed-image-2'
    );
    expect(mockResolveChatAssetUrlWithExpiry).toHaveBeenCalledTimes(2);
  });

  it('retries transient image preview resolution failures', async () => {
    mockResolveChatAssetUrlWithExpiry
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        url: 'https://example.com/signed-image-retry',
        expiresAt: Date.now() + 90_000,
      });

    const messages: ChatMessage[] = [
      {
        id: 'image-retry-1',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        channel_id: 'dm_user-a_user-b',
        message: 'images/channel/image-retry-1.png',
        created_at: '2026-03-10T10:00:00.000Z',
        updated_at: '2026-03-10T10:00:00.000Z',
        is_read: false,
        message_type: 'image',
        file_storage_path: 'images/channel/user-a_image-retry-1.png',
      },
    ];

    const { result } = renderHook(() => useMessageImagePreviews({ messages }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.getImageMessageUrl(messages[0]!)).toBeNull();
    expect(mockResolveChatAssetUrlWithExpiry).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.getImageMessageUrl(messages[0]!)).toBe(
      'https://example.com/signed-image-retry'
    );
    expect(mockResolveChatAssetUrlWithExpiry).toHaveBeenCalledTimes(2);
  });

  it('resolves preview urls for image files sent as document attachments', async () => {
    mockResolveChatAssetUrlWithExpiry.mockResolvedValueOnce({
      url: 'https://example.com/signed-image-file',
      expiresAt: Date.now() + 90_000,
    });

    const messages: ChatMessage[] = [
      {
        id: 'file-image-1',
        sender_id: 'user-b',
        receiver_id: 'user-a',
        channel_id: 'dm_user-a_user-b',
        message: 'documents/channel/screenshot.png',
        created_at: '2026-03-10T10:00:00.000Z',
        updated_at: '2026-03-10T10:00:00.000Z',
        is_read: false,
        message_type: 'file',
        file_name: 'screenshot.png',
        file_mime_type: 'image/png',
        file_storage_path: 'documents/channel/screenshot.png',
      },
    ];

    const { result } = renderHook(() => useMessageImagePreviews({ messages }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.getImageMessageUrl(messages[0]!)).toBe(
      'https://example.com/signed-image-file'
    );
    expect(mockResolveChatAssetUrlWithExpiry).toHaveBeenCalledTimes(1);
  });
});
