import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useMessageImagePreviews } from '../hooks/useMessageImagePreviews';
import type { ChatMessage } from '../data/chatSidebarGateway';

const {
  mockActivateChannelImageAssetScope,
  mockEnsureChannelImageAssetUrl,
  mockGetCachedResolvedChatAssetUrl,
  mockGetRuntimeChannelImageAssetUrl,
  mockResolveChatAssetUrl,
} = vi.hoisted(() => ({
  mockActivateChannelImageAssetScope: vi.fn(),
  mockEnsureChannelImageAssetUrl: vi.fn(),
  mockGetCachedResolvedChatAssetUrl: vi.fn(),
  mockGetRuntimeChannelImageAssetUrl: vi.fn(),
  mockResolveChatAssetUrl: vi.fn(),
}));

vi.mock('../utils/channel-image-asset-cache', () => ({
  activateChannelImageAssetScope: mockActivateChannelImageAssetScope,
  ensureChannelImageAssetUrl: mockEnsureChannelImageAssetUrl,
  getRuntimeChannelImageAssetUrl: mockGetRuntimeChannelImageAssetUrl,
  isCacheableChannelImageMessage: vi.fn(
    (
      message: Pick<
        ChatMessage,
        'message_type' | 'file_name' | 'file_mime_type'
      >
    ) =>
      message.message_type === 'image' ||
      (message.message_type === 'file' &&
        message.file_mime_type?.startsWith('image/'))
  ),
}));

vi.mock('../utils/message-file', () => ({
  getCachedResolvedChatAssetUrl: mockGetCachedResolvedChatAssetUrl,
  isDirectChatAssetUrl: vi.fn((url: string) =>
    /^(https?:\/\/|blob:|data:|\/)/i.test(url)
  ),
  resolveChatAssetUrl: mockResolveChatAssetUrl,
}));

describe('useMessageImagePreviews', () => {
  const createMessage = (
    overrides: Partial<ChatMessage> = {}
  ): ChatMessage => ({
    id: 'image-1',
    sender_id: 'user-b',
    receiver_id: 'user-a',
    channel_id: 'dm_user-a_user-b',
    message: 'images/channel/image-1.png',
    created_at: '2026-03-10T10:00:00.000Z',
    updated_at: '2026-03-10T10:00:00.000Z',
    is_read: false,
    message_type: 'image',
    file_storage_path: 'images/channel/image-1.png',
    ...overrides,
  });

  const createBubbleElement = (top: number, bottom: number) => {
    const element = document.createElement('div');
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom,
      left: 0,
      right: 240,
      width: 240,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect);
    return element;
  };

  const createHookProps = (messages: ChatMessage[]) => {
    const messagesContainerRef = {
      current: document.createElement('div'),
    };
    const chatHeaderContainerRef = {
      current: null,
    };
    const messageBubbleRefs = {
      current: new Map<string, HTMLDivElement>(),
    };
    const getVisibleMessagesBounds = () =>
      ({
        containerRect: {
          top: 0,
          bottom: 480,
          left: 0,
          right: 280,
          width: 280,
          height: 480,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect,
        visibleBottom: 480,
      }) satisfies ReturnType<
        Parameters<
          typeof useMessageImagePreviews
        >[0]['getVisibleMessagesBounds']
      >;

    return {
      currentChannelId: 'dm_user-a_user-b',
      messages,
      messagesContainerRef,
      chatHeaderContainerRef,
      messageBubbleRefs,
      getVisibleMessagesBounds,
    };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockEnsureChannelImageAssetUrl.mockImplementation(
      async (_channelId, message: ChatMessage, variant: 'thumbnail' | 'full') =>
        `blob:${variant}-${message.id}`
    );
    mockGetRuntimeChannelImageAssetUrl.mockReturnValue(null);
    mockGetCachedResolvedChatAssetUrl.mockReturnValue(null);
    mockResolveChatAssetUrl.mockResolvedValue(null);
  });

  it('prefetches thumbnail assets first for image bubbles visible in the viewport', async () => {
    const visibleMessage = createMessage({
      id: 'visible-image',
    });
    const hiddenMessage = createMessage({
      id: 'hidden-image',
      message: 'images/channel/hidden.png',
      file_storage_path: 'images/channel/hidden.png',
    });
    const props = createHookProps([visibleMessage, hiddenMessage]);

    props.messageBubbleRefs.current.set(
      'visible-image',
      createBubbleElement(40, 240)
    );
    props.messageBubbleRefs.current.set(
      'hidden-image',
      createBubbleElement(520, 720)
    );

    const { result } = renderHook(() => useMessageImagePreviews(props));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(90);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockActivateChannelImageAssetScope).toHaveBeenCalledWith(
      'dm_user-a_user-b'
    );
    expect(mockEnsureChannelImageAssetUrl).toHaveBeenCalledWith(
      'dm_user-a_user-b',
      expect.objectContaining({
        id: 'visible-image',
      }),
      'thumbnail'
    );
    expect(mockEnsureChannelImageAssetUrl).not.toHaveBeenCalledWith(
      'dm_user-a_user-b',
      expect.objectContaining({
        id: 'hidden-image',
      }),
      expect.anything()
    );
    expect(result.current.getImageMessageUrl(visibleMessage)).toBe(
      'blob:thumbnail-visible-image'
    );
    expect(result.current.getImageMessageUrl(hiddenMessage)).toBeNull();
  });

  it('returns runtime full assets immediately when the thumbnail runtime entry is missing', () => {
    const message = createMessage({
      id: 'runtime-full',
    });
    const props = createHookProps([message]);
    props.messageBubbleRefs.current.set(
      'runtime-full',
      createBubbleElement(32, 180)
    );
    mockGetRuntimeChannelImageAssetUrl.mockImplementation(
      (_channelId, messageId: string, variant: 'thumbnail' | 'full') =>
        messageId === 'runtime-full' && variant === 'full'
          ? 'blob:runtime-full'
          : null
    );

    const { result } = renderHook(() => useMessageImagePreviews(props));

    expect(result.current.getImageMessageUrl(message)).toBe(
      'blob:runtime-full'
    );
  });

  it('uses cached signed preview urls immediately on the first render', () => {
    const message = createMessage({
      id: 'cached-preview',
      file_preview_url: 'previews/channel/cached-preview.fit-v2.webp',
    });
    const props = createHookProps([message]);
    mockGetCachedResolvedChatAssetUrl.mockReturnValue(
      'https://signed.example/previews/channel/cached-preview.fit-v2.webp'
    );

    const { result } = renderHook(() => useMessageImagePreviews(props));

    expect(result.current.getImageMessageUrl(message)).toBe(
      'https://signed.example/previews/channel/cached-preview.fit-v2.webp'
    );
    expect(mockEnsureChannelImageAssetUrl).not.toHaveBeenCalled();
  });

  it('resolves persisted image preview assets before the full blob cache is ready', async () => {
    const message = createMessage({
      id: 'persisted-preview',
      file_preview_url: 'previews/channel/persisted-preview.webp',
    });
    const props = createHookProps([message]);
    props.messageBubbleRefs.current.set(
      'persisted-preview',
      createBubbleElement(32, 180)
    );
    mockEnsureChannelImageAssetUrl.mockImplementation(
      async () =>
        await new Promise<string>(resolve => {
          window.setTimeout(() => {
            resolve('blob:full-persisted-preview');
          }, 300);
        })
    );
    mockResolveChatAssetUrl.mockResolvedValue(
      'https://signed.example/previews/channel/persisted-preview.webp'
    );

    const { result } = renderHook(() => useMessageImagePreviews(props));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(90);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockEnsureChannelImageAssetUrl).not.toHaveBeenCalled();
    expect(result.current.getImageMessageUrl(message)).toBe(
      'https://signed.example/previews/channel/persisted-preview.webp'
    );
  });

  it('falls back to direct asset urls for uncached direct image attachments', () => {
    const message = createMessage({
      id: 'direct-preview',
      message: 'https://example.com/images/direct-preview.png',
    });
    const props = createHookProps([message]);

    const { result } = renderHook(() => useMessageImagePreviews(props));

    expect(result.current.getImageMessageUrl(message)).toBe(
      'https://example.com/images/direct-preview.png'
    );
  });

  it('does not activate a null channel scope when the sidebar closes', () => {
    const message = createMessage();
    const props = createHookProps([message]);
    const initialProps: { currentChannelId: string | null } = {
      currentChannelId: 'dm_user-a_user-b',
    };

    const { rerender } = renderHook(
      ({ currentChannelId }: { currentChannelId: string | null }) =>
        useMessageImagePreviews({
          ...props,
          currentChannelId,
        }),
      {
        initialProps,
      }
    );

    rerender({
      currentChannelId: null,
    });

    expect(mockActivateChannelImageAssetScope).toHaveBeenCalledTimes(1);
    expect(mockActivateChannelImageAssetScope).toHaveBeenCalledWith(
      'dm_user-a_user-b'
    );
    expect(mockActivateChannelImageAssetScope).not.toHaveBeenCalledWith(null);
  });
});
