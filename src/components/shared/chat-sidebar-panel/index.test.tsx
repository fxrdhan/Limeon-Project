import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatSidebarPanel from './index';

type ChannelHandler = {
  eventType: string;
  filter: Record<string, unknown>;
  callback: (payload: Record<string, unknown>) => void;
};

type ChannelMock = {
  name: string;
  handlers: ChannelHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const useAuthStoreMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const clipboardWriteTextMock = vi.hoisted(() => vi.fn());
const createChannelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());
const channelRegistry = vi.hoisted(() => new Map<string, ChannelMock>());

const chatServiceMock = vi.hoisted(() => ({
  fetchMessagesBetweenUsers: vi.fn(),
  insertMessage: vi.fn(),
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
  getUserPresence: vi.fn(),
  updateUserPresence: vi.fn(),
  insertUserPresence: vi.fn(),
}));

const cacheImageBlobMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/services/api/chat.service', () => ({
  chatService: chatServiceMock,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: {
    createChannel: createChannelMock,
    removeChannel: removeChannelMock,
  },
}));

vi.mock('@/utils/imageCache', () => ({
  cacheImageBlob: cacheImageBlobMock,
  getCachedImageBlobUrl: getCachedImageBlobUrlMock,
  setCachedImage: setCachedImageMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
  Toaster: () => <div data-testid="chat-toaster" />,
}));

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

const currentUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@example.com',
  profilephoto: null,
};

const targetUser = {
  id: 'user-2',
  name: 'Target User',
  email: 'target@example.com',
  profilephoto: null,
};

const createMessage = (
  overrides: Partial<{
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    updated_at: string;
  }> = {}
) => ({
  id: overrides.id ?? 'msg-1',
  sender_id: overrides.sender_id ?? targetUser.id,
  receiver_id: overrides.receiver_id ?? currentUser.id,
  channel_id: 'dm_user-1_user-2',
  message: overrides.message ?? 'Halo dari target',
  message_type: 'text' as const,
  created_at: overrides.created_at ?? '2026-02-08T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-02-08T00:00:00.000Z',
  is_read: false,
  reply_to_id: null,
});

const getHandler = (
  channelName: string,
  eventType: string,
  eventName: string
) => {
  const channel = channelRegistry.get(channelName);
  expect(channel).toBeTruthy();

  const handler = channel?.handlers.find(
    entry => entry.eventType === eventType && entry.filter?.event === eventName
  );
  expect(handler).toBeTruthy();
  return handler!.callback;
};

describe('ChatSidebarPanel', () => {
  beforeEach(() => {
    channelRegistry.clear();

    useAuthStoreMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    clipboardWriteTextMock.mockReset();
    createChannelMock.mockReset();
    removeChannelMock.mockReset();

    chatServiceMock.fetchMessagesBetweenUsers.mockReset();
    chatServiceMock.insertMessage.mockReset();
    chatServiceMock.updateMessage.mockReset();
    chatServiceMock.deleteMessage.mockReset();
    chatServiceMock.getUserPresence.mockReset();
    chatServiceMock.updateUserPresence.mockReset();
    chatServiceMock.insertUserPresence.mockReset();

    cacheImageBlobMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    setCachedImageMock.mockReset();

    useAuthStoreMock.mockReturnValue({
      user: currentUser,
    });

    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [createMessage()],
      error: null,
    });
    chatServiceMock.insertMessage.mockResolvedValue({
      data: createMessage({
        id: 'msg-real-1',
        sender_id: currentUser.id,
        receiver_id: targetUser.id,
        message: 'Balasan cepat',
      }),
      error: null,
    });
    chatServiceMock.updateMessage.mockResolvedValue({
      data: createMessage({
        id: 'msg-self',
        sender_id: currentUser.id,
        receiver_id: targetUser.id,
        message: 'Pesan sudah diedit',
      }),
      error: null,
    });
    chatServiceMock.deleteMessage.mockResolvedValue({
      data: null,
      error: null,
    });
    chatServiceMock.getUserPresence.mockResolvedValue({
      data: {
        user_id: targetUser.id,
        is_online: false,
        current_chat_channel: null,
        last_seen: '2026-02-08T00:00:00.000Z',
      },
      error: null,
    });
    chatServiceMock.updateUserPresence.mockResolvedValue({
      data: [
        {
          user_id: currentUser.id,
          is_online: true,
          current_chat_channel: 'dm_user-1_user-2',
          last_seen: '2026-02-08T00:00:01.000Z',
        },
      ],
      error: null,
    });
    chatServiceMock.insertUserPresence.mockResolvedValue({
      data: [],
      error: null,
    });

    cacheImageBlobMock.mockResolvedValue(null);
    getCachedImageBlobUrlMock.mockResolvedValue(null);

    createChannelMock.mockImplementation((name: string) => {
      const channel: ChannelMock = {
        name,
        handlers: [],
        on: vi.fn((eventType, filter, callback) => {
          channel.handlers.push({
            eventType: String(eventType),
            filter: filter as Record<string, unknown>,
            callback: callback as (payload: Record<string, unknown>) => void,
          });
          return channel;
        }),
        subscribe: vi.fn((callback?: (status: string) => void) => {
          if (typeof callback === 'function') callback('SUBSCRIBED');
          return channel;
        }),
        send: vi.fn(),
        unsubscribe: vi.fn(),
      };
      channelRegistry.set(name, channel);
      return channel;
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteTextMock.mockResolvedValue(undefined),
      },
      configurable: true,
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('loads messages, handles realtime updates, and sends new message', async () => {
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    expect(await screen.findByText('Halo dari target')).toBeInTheDocument();
    expect(chatServiceMock.fetchMessagesBetweenUsers).toHaveBeenCalledWith(
      currentUser.id,
      targetUser.id
    );

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Balasan cepat' } });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.insertMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Balasan cepat',
        })
      );
    });

    const chatChannel = channelRegistry.get('chat_dm_user-1_user-2');
    expect(chatChannel?.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'new_message',
      })
    );

    const newMessageHandler = getHandler(
      'chat_dm_user-1_user-2',
      'broadcast',
      'new_message'
    );
    act(() => {
      newMessageHandler({
        payload: createMessage({
          id: 'msg-realtime',
          message: 'Realtime masuk',
        }),
      });
    });
    expect(await screen.findByText('Realtime masuk')).toBeInTheDocument();

    const updateMessageHandler = getHandler(
      'chat_dm_user-1_user-2',
      'broadcast',
      'update_message'
    );
    act(() => {
      updateMessageHandler({
        payload: createMessage({
          id: 'msg-realtime',
          message: 'Realtime diubah',
        }),
      });
    });
    expect(await screen.findByText('Realtime diubah')).toBeInTheDocument();

    const deleteMessageHandler = getHandler(
      'chat_dm_user-1_user-2',
      'broadcast',
      'delete_message'
    );
    act(() => {
      deleteMessageHandler({
        payload: { id: 'msg-realtime' },
      });
    });
    await waitFor(() => {
      expect(screen.queryByText('Realtime diubah')).not.toBeInTheDocument();
    });

    const globalPresenceHandler = getHandler(
      'global_presence_updates',
      'broadcast',
      'presence_changed'
    );
    act(() => {
      globalPresenceHandler({
        payload: {
          user_id: targetUser.id,
          is_online: true,
          current_chat_channel: 'dm_user-1_user-2',
          last_seen: '2026-02-08T00:10:00.000Z',
        },
      });
    });
    expect(await screen.findByText('Online')).toBeInTheDocument();
  });

  it('supports copy, edit, delete, and close flow', async () => {
    const onClose = vi.fn();
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-self',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan saya',
        }),
      ],
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={onClose} targetUser={targetUser} />
    );

    await screen.findByText('Pesan saya');
    fireEvent.click(screen.getByRole('button', { name: 'Pesan saya' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salin' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Pesan saya');
    });
    expect(toastSuccessMock).toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'Pesan saya' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const textarea = screen.getByPlaceholderText('Type a message...');
    expect(textarea).toHaveValue('Pesan saya');
    fireEvent.change(textarea, {
      target: { value: 'Pesan sudah diedit' },
    });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.updateMessage).toHaveBeenCalledWith(
        'msg-self',
        expect.objectContaining({
          message: 'Pesan sudah diedit',
        })
      );
    });

    await screen.findByText('Pesan sudah diedit');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pesan sudah diedit' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(chatServiceMock.deleteMessage).toHaveBeenCalledWith('msg-self');
    });
    await waitFor(() => {
      expect(screen.queryByText('Pesan sudah diedit')).not.toBeInTheDocument();
    });

    const closeButton = screen
      .getAllByRole('button')
      .find(button => button.textContent === '✕');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(chatServiceMock.updateUserPresence).toHaveBeenCalledWith(
      currentUser.id,
      expect.objectContaining({
        is_online: false,
        current_chat_channel: null,
      })
    );
    expect(
      channelRegistry.get('global_presence_updates')?.send
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'presence_changed',
      })
    );
  }, 15000);

  it('returns null when panel is closed', () => {
    const { container } = render(
      <ChatSidebarPanel
        isOpen={false}
        onClose={vi.fn()}
        targetUser={targetUser}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows toast error when copy action fails', async () => {
    clipboardWriteTextMock.mockRejectedValueOnce(new Error('copy-failed'));

    render(
      <ChatSidebarPanel
        isOpen
        onClose={vi.fn()}
        targetUser={{
          ...targetUser,
          profilephoto: 'https://example.com/target.png',
        }}
      />
    );

    await screen.findByText('Halo dari target');
    fireEvent.click(screen.getByRole('button', { name: 'Halo dari target' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Salin' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
  });

  it('falls back to insert presence and restores message input when send fails', async () => {
    chatServiceMock.updateUserPresence.mockResolvedValueOnce({
      data: [],
      error: { code: 'NO_ROWS' },
    });
    chatServiceMock.insertMessage.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert-failed' },
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Halo dari target');

    await waitFor(() => {
      expect(chatServiceMock.insertUserPresence).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Pesan gagal kirim' } });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.insertMessage).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toHaveValue(
        'Pesan gagal kirim'
      );
    });
  });

  it('handles update and delete errors without broadcasting mutations', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-own-error',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan error',
        }),
      ],
      error: null,
    });
    chatServiceMock.updateMessage.mockResolvedValueOnce({
      data: null,
      error: { message: 'update-failed' },
    });
    chatServiceMock.deleteMessage.mockResolvedValueOnce({
      data: null,
      error: { message: 'delete-failed' },
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Pesan error');
    fireEvent.click(screen.getByRole('button', { name: 'Pesan error' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, {
      target: { value: 'Pesan error diubah' },
    });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.updateMessage).toHaveBeenCalled();
    });

    fireEvent.click(
      await screen.findByRole('button', { name: /Pesan error/i })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(chatServiceMock.deleteMessage).toHaveBeenCalledWith(
        'msg-own-error'
      );
    });
    expect(errorSpy).toHaveBeenCalled();

    const chatChannel = channelRegistry.get('chat_dm_user-1_user-2');
    expect(chatChannel?.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'delete_message' })
    );
    errorSpy.mockRestore();
  });

  it('renders long messages with read more and read less toggles', async () => {
    const veryLongMessage = `Long message ${'x'.repeat(280)}`;
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [createMessage({ id: 'msg-long', message: veryLongMessage })],
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    expect(await screen.findByText('Read more')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Read more'));
    expect(await screen.findByText('Read less')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Read less'));
    expect(await screen.findByText('Read more')).toBeInTheDocument();
  });

  it('performs centralized close when isOpen changes from true to false', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ChatSidebarPanel isOpen onClose={onClose} targetUser={targetUser} />
    );

    await screen.findByText('Halo dari target');
    rerender(
      <ChatSidebarPanel
        isOpen={false}
        onClose={onClose}
        targetUser={targetUser}
      />
    );

    await waitFor(() => {
      expect(chatServiceMock.updateUserPresence).toHaveBeenCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: false,
          current_chat_channel: null,
        })
      );
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
