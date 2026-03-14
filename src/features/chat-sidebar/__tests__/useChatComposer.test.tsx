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

vi.mock('react-hot-toast', () => ({
  default: mockToast,
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
});
