import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatComposer } from '../hooks/useChatComposer';

const { mockToast, mockUseChatComposerActions } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  mockUseChatComposerActions: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../hooks/useChatComposerActions', () => ({
  useChatComposerActions: mockUseChatComposerActions,
}));

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
    mockUseChatComposerActions.mockImplementation(
      ({ setEditingMessageId, setMessage }) => ({
        handleSendMessage: vi.fn(),
        handleKeyPress: vi.fn(),
        handleEditMessage: (targetMessage: ChatMessage) => {
          setEditingMessageId(targetMessage.id);
          setMessage(targetMessage.message);
        },
        handleCopyMessage: vi.fn(),
        handleDownloadMessage: vi.fn(),
        handleDeleteMessage: vi.fn().mockResolvedValue(true),
        handleCancelEditMessage: () => {
          setEditingMessageId(null);
          setMessage('');
        },
      })
    );
  });

  it('resets composer-scoped state when switching to another channel', async () => {
    const focusMessageComposer = vi.fn();
    const closeMessageMenu = vi.fn();
    const scheduleScrollMessagesToBottom = vi.fn();
    const currentMessage = buildMessage({
      id: 'message-1',
      message: 'draft edit',
    });

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          user: { id: 'user-a', name: 'Admin' },
          targetUser: {
            id: 'user-b',
            name: 'Gudang',
            email: 'gudang@example.com',
            profilephoto: null,
          },
          currentChannelId: channelId,
          messages: [currentMessage],
          setMessages: vi.fn(),
          closeMessageMenu,
          scheduleScrollMessagesToBottom,
          messageInputRef,
          focusMessageComposer,
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
      result.current.handleEditMessage(currentMessage);
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft edit');
      expect(result.current.editingMessageId).toBe('message-1');
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.message).toBe('');
      expect(result.current.editingMessageId).toBeNull();
      expect(result.current.pendingComposerAttachments).toHaveLength(0);
    });
  });
});
