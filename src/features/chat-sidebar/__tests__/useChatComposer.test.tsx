import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatComposer } from '../hooks/useChatComposer';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
const { mockRemoteAssetService } = vi.hoisted(() => ({
  mockRemoteAssetService: {
    fetchRemoteAsset: vi.fn(),
  },
}));
const { mockFetchAttachmentComposerRemoteFile } = vi.hoisted(() => ({
  mockFetchAttachmentComposerRemoteFile: vi.fn(),
}));
const { mockValidateAttachmentComposerLink } = vi.hoisted(() => ({
  mockValidateAttachmentComposerLink: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

vi.mock('../utils/composer-attachment-link', async () => {
  const actual = await vi.importActual('../utils/composer-attachment-link');

  return {
    ...actual,
    fetchAttachmentComposerRemoteFile: mockFetchAttachmentComposerRemoteFile,
    validateAttachmentComposerLink: mockValidateAttachmentComposerLink,
  };
});

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'stok awal',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('useChatComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn() as typeof cancelAnimationFrame
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:preview'),
        revokeObjectURL: vi.fn(),
      })
    );
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: null,
      error: null,
    });
    mockFetchAttachmentComposerRemoteFile.mockResolvedValue(null);
    mockValidateAttachmentComposerLink.mockResolvedValue(true);
  });

  it('mereset state composer ketika berpindah ke channel lain', async () => {
    const closeMessageMenu = vi.fn();
    const currentMessage = buildMessage({
      id: 'message-1',
      message: 'draft edit',
    });

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: channelId,
          messages: [currentMessage],
          closeMessageMenu,
          messageInputRef,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    await act(async () => {
      result.current.setMessage('draft belum terkirim');
      result.current.queueComposerImage(
        new File(['image'], 'stok.png', { type: 'image/png' })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft belum terkirim');
      expect(result.current.editingMessageId).toBeNull();
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.message).toBe('');
      expect(result.current.editingMessageId).toBeNull();
      expect(result.current.pendingComposerAttachments).toHaveLength(0);
    });
  });

  it('menghapus prompt paste dan loading attachment ketika channel berpindah saat konversi attachment masih berjalan', async () => {
    let resolveRemoteAsset:
      | ((value: { file: File; fileKind: 'image'; sourceUrl: string }) => void)
      | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: channelId,
          messages: [],
          closeMessageMenu: vi.fn(),
          messageInputRef,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.handleComposerPaste({
        preventDefault: vi.fn(),
        currentTarget: Object.assign(document.createElement('textarea'), {
          value: '',
          selectionStart: 0,
          selectionEnd: 0,
        }),
        clipboardData: {
          items: [],
          getData: (format: string) =>
            format === 'text/plain'
              ? 'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
              : '',
        },
      } as never);
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    expect(result.current.attachmentPastePromptUrl).toBe(
      'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
    );

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.loadingComposerAttachments).toEqual([]);
      expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
      expect(result.current.attachmentPastePromptUrl).toBeNull();
    });

    await act(async () => {
      resolveRemoteAsset?.({
        file: new File(['image'], 'Ubuntu-25.10-Questing-Quokka.jpg', {
          type: 'image/jpeg',
        }),
        fileKind: 'image',
        sourceUrl:
          'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg',
      });
      await Promise.resolve();
    });

    expect(result.current.pendingComposerAttachments).toEqual([]);
  });
});
