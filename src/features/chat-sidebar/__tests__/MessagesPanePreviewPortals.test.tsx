import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { MessagesPanePreviewPortals } from '../components/MessagesPanePreviewPortals';
import type { MessagesPanePreviewRuntime } from '../components/messagesPaneRuntime';
import { CHAT_COPY_LOADING_TOAST_DELAY_MS } from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';

const {
  mockCopyTextToClipboard,
  mockOpenChatFileInNewTab,
  mockResolveCopyableChatAssetUrl,
  mockToast,
} = vi.hoisted(() => ({
  mockCopyTextToClipboard: vi.fn(),
  mockOpenChatFileInNewTab: vi.fn(),
  mockResolveCopyableChatAssetUrl: vi.fn(),
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/components/shared/image-expand-preview', () => ({
  default: ({
    children,
    isOpen,
  }: {
    children?: React.ReactNode;
    isOpen?: boolean;
  }) =>
    isOpen ? <div data-testid="image-expand-preview">{children}</div> : null,
}));

vi.mock('../components/ProgressiveImagePreview', () => ({
  default: () => <div data-testid="progressive-image-preview" />,
}));

vi.mock('../components/DocumentPreviewPortal', () => ({
  default: () => null,
}));

vi.mock('../utils/message-file', async () => {
  const actual = await vi.importActual('../utils/message-file');

  return {
    ...actual,
    openChatFileInNewTab: mockOpenChatFileInNewTab,
    resolveCopyableChatAssetUrl: mockResolveCopyableChatAssetUrl,
  };
});

vi.mock('../utils/clipboard', () => ({
  copyTextToClipboard: mockCopyTextToClipboard,
}));

const imageMessage: ChatMessage = {
  id: 'image-1',
  sender_id: 'user-a',
  receiver_id: 'user-b',
  channel_id: 'channel-1',
  message: 'https://example.com/images/photo.png',
  message_type: 'image',
  created_at: '2026-03-12T10:00:00.000Z',
  updated_at: '2026-03-12T10:00:00.000Z',
  is_read: false,
  is_delivered: false,
  reply_to_id: null,
  file_name: 'photo.png',
  file_kind: 'image',
  file_mime_type: 'image/png',
  file_size: 1024,
  file_storage_path: null,
  file_preview_url: null,
  file_preview_page_count: null,
  file_preview_status: null,
  file_preview_error: null,
};

const otherImageMessage: ChatMessage = {
  ...imageMessage,
  id: 'image-2',
  message: 'https://example.com/images/second.png',
  file_name: 'second.png',
};

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(promiseResolve => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const buildRuntime = (
  activeMessage: ChatMessage = imageMessage
): MessagesPanePreviewRuntime => ({
  isImagePreviewOpen: false,
  isImagePreviewVisible: false,
  closeImagePreview: vi.fn(),
  imagePreviewUrl: null,
  imagePreviewBackdropUrl: null,
  imagePreviewName: '',
  imageGroupPreviewItems: [
    {
      id: activeMessage.id,
      thumbnailUrl: 'data:image/png;base64,thumb',
      previewUrl: 'data:image/png;base64,preview',
      fullPreviewUrl: activeMessage.message,
      previewName: activeMessage.file_name || 'photo.png',
    },
  ],
  activeImageGroupPreviewId: activeMessage.id,
  isImageGroupPreviewVisible: true,
  selectImageGroupPreviewItem: vi.fn(),
  handleDownloadMessage: vi.fn().mockResolvedValue(undefined),
  handleCopyMessage: vi.fn().mockResolvedValue(undefined),
  handleReplyMessage: vi.fn(),
  handleOpenForwardMessagePicker: vi.fn(),
  closeImageGroupPreview: vi.fn(),
  documentPreviewUrl: null,
  documentPreviewName: '',
  isDocumentPreviewVisible: false,
  closeDocumentPreview: vi.fn(),
  activeImageGroupPreviewMessage: activeMessage,
});

describe('MessagesPanePreviewPortals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows feedback when opening the active image preview in a new tab is blocked', async () => {
    mockOpenChatFileInNewTab.mockResolvedValue(false);

    render(
      <MessagesPanePreviewPortals
        runtime={buildRuntime()}
        activeImageGroupPreviewMessage={imageMessage}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buka di tab baru' }));

    await waitFor(() => {
      expect(mockOpenChatFileInNewTab).toHaveBeenCalledWith(
        imageMessage.message,
        imageMessage.file_storage_path,
        imageMessage.file_mime_type
      );
      expect(mockToast.error).toHaveBeenCalledWith(
        'Browser memblokir tab baru',
        {
          toasterId: 'chat-sidebar-toaster',
        }
      );
    });
  });

  it('copies the active image preview link', async () => {
    mockResolveCopyableChatAssetUrl.mockResolvedValue(
      'https://cdn.example.com/photo.png'
    );
    mockCopyTextToClipboard.mockResolvedValue(undefined);

    render(
      <MessagesPanePreviewPortals
        runtime={buildRuntime()}
        activeImageGroupPreviewMessage={imageMessage}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));

    await waitFor(() => {
      expect(mockResolveCopyableChatAssetUrl).toHaveBeenCalledWith(
        imageMessage.message,
        imageMessage.file_storage_path,
        {
          allowAssetUrlFallback: false,
          messageId: imageMessage.id,
          sharedLinkSlug: imageMessage.shared_link_slug,
        }
      );
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith(
        'https://cdn.example.com/photo.png'
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        'Link gambar berhasil disalin',
        {
          id: undefined,
          toasterId: 'chat-sidebar-toaster',
        }
      );
    });
  });

  it('does not show stale copy-link feedback after the active image preview changes', async () => {
    vi.useFakeTimers();
    const deferredCopyableUrl = createDeferred<string | null>();
    mockResolveCopyableChatAssetUrl.mockReturnValue(
      deferredCopyableUrl.promise
    );
    mockCopyTextToClipboard.mockResolvedValue(undefined);

    const { rerender } = render(
      <MessagesPanePreviewPortals
        runtime={buildRuntime(imageMessage)}
        activeImageGroupPreviewMessage={imageMessage}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));

    rerender(
      <MessagesPanePreviewPortals
        runtime={buildRuntime(otherImageMessage)}
        activeImageGroupPreviewMessage={otherImageMessage}
      />
    );

    act(() => {
      vi.advanceTimersByTime(CHAT_COPY_LOADING_TOAST_DELAY_MS);
    });
    await act(async () => {
      deferredCopyableUrl.resolve('https://cdn.example.com/photo.png');
      await Promise.resolve();
    });

    expect(mockToast.loading).not.toHaveBeenCalled();
    expect(mockCopyTextToClipboard).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it('dismisses pending copy-link feedback when the image preview portal unmounts', async () => {
    vi.useFakeTimers();
    const deferredCopyableUrl = createDeferred<string | null>();
    mockResolveCopyableChatAssetUrl.mockReturnValue(
      deferredCopyableUrl.promise
    );
    mockCopyTextToClipboard.mockResolvedValue(undefined);

    const { unmount } = render(
      <MessagesPanePreviewPortals
        runtime={buildRuntime()}
        activeImageGroupPreviewMessage={imageMessage}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));

    act(() => {
      vi.advanceTimersByTime(CHAT_COPY_LOADING_TOAST_DELAY_MS);
    });
    expect(mockToast.loading).toHaveBeenCalledWith(
      'Menyiapkan link gambar...',
      {
        id: 'chat-copy-image-link',
        toasterId: 'chat-sidebar-toaster',
      }
    );

    unmount();
    await act(async () => {
      deferredCopyableUrl.resolve('https://cdn.example.com/photo.png');
      await Promise.resolve();
    });

    expect(mockToast.dismiss).toHaveBeenCalledWith('chat-copy-image-link');
    expect(mockCopyTextToClipboard).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
