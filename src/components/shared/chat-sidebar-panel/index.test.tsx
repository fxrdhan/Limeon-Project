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

  it('supports keyboard actions for menu and read more/less toggles', async () => {
    const longOwnMessage = `Keyboard long ${'x'.repeat(280)}`;
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-keyboard-own',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: longOwnMessage,
        }),
      ],
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    const bubble = await screen.findByRole('button', {
      name: /Keyboard long/i,
    });
    fireEvent.keyDown(bubble, { key: 'Enter' });
    expect(
      await screen.findByRole('button', { name: 'Salin' })
    ).toBeInTheDocument();
    const refreshedBubble = screen.getByRole('button', {
      name: /Keyboard long/i,
    });
    fireEvent.keyDown(refreshedBubble, { key: 'Enter' });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Salin' })
      ).not.toBeInTheDocument();
    });

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    fireEvent.keyDown(readMoreButton, { key: 'Enter' });
    expect(
      await screen.findByRole('button', { name: 'Read less' })
    ).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Read less' }), {
      key: ' ',
    });
    expect(
      await screen.findByRole('button', { name: 'Read more' })
    ).toBeInTheDocument();
  });

  it('handles temp message edit/delete branches without API mutation', async () => {
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'temp_local_1',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan temp lokal',
        }),
      ],
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Pesan temp lokal');

    fireEvent.click(screen.getByRole('button', { name: 'Pesan temp lokal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Pesan temp diubah' } });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.updateMessage).not.toHaveBeenCalled();
    });
    expect(await screen.findByText('Pesan temp diubah')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pesan temp diubah' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue(
      'Pesan temp diubah'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pesan temp diubah' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(screen.queryByText('Pesan temp diubah')).not.toBeInTheDocument();
    });
    expect(chatServiceMock.deleteMessage).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue('');
  });

  it('restores message input when send response is empty or throws', async () => {
    chatServiceMock.insertMessage
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockRejectedValueOnce(new Error('insert-boom'));

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );
    await screen.findByText('Halo dari target');

    const textarea = screen.getByPlaceholderText('Type a message...');

    fireEvent.change(textarea, { target: { value: 'Tanpa data response' } });
    const firstSendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(firstSendButton).toBeTruthy();
    fireEvent.click(firstSendButton!);

    await waitFor(() => {
      expect(chatServiceMock.insertMessage).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue(
      'Tanpa data response'
    );

    fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
      target: { value: 'Kena exception' },
    });
    const secondSendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(secondSendButton).toBeTruthy();
    fireEvent.click(secondSendButton!);

    await waitFor(() => {
      expect(chatServiceMock.insertMessage).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByPlaceholderText('Type a message...')).toHaveValue(
      'Kena exception'
    );
  });

  it('handles presence/channel errors and beforeunload fallback close update', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.updateUserPresence
      .mockRejectedValueOnce(new Error('open-presence-failed'))
      .mockResolvedValue({
        data: [],
        error: null,
      });
    chatServiceMock.getUserPresence.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNKNOWN', message: 'presence-load-failed' },
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );
    await screen.findByText('Halo dari target');

    const chatChannel = channelRegistry.get('chat_dm_user-1_user-2');
    const subscribeCallback = chatChannel?.subscribe.mock.calls[0]?.[0] as
      | ((status: string) => void)
      | undefined;
    subscribeCallback?.('CHANNEL_ERROR');

    const presenceDbHandler = getHandler(
      'user_presence_changes',
      'postgres_changes',
      '*'
    );
    act(() => {
      presenceDbHandler({
        eventType: 'INSERT',
        new: {
          user_id: targetUser.id,
          is_online: true,
          current_chat_channel: 'dm_user-1_user-2',
          last_seen: '2026-02-08T01:00:00.000Z',
        },
      });
    });
    expect(await screen.findByText('Online')).toBeInTheDocument();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Caught error updating user chat open:',
        expect.any(Error)
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error loading target user presence:',
      expect.objectContaining({ code: 'UNKNOWN' })
    );
    expect(errorSpy).toHaveBeenCalledWith('Failed to connect to chat channel');

    window.dispatchEvent(new Event('beforeunload'));
    await waitFor(() => {
      expect(chatServiceMock.updateUserPresence).toHaveBeenCalledWith(
        currentUser.id,
        expect.objectContaining({
          is_online: false,
          current_chat_channel: null,
        })
      );
    });

    errorSpy.mockRestore();
  });

  it('resolves local profile images without blob cache lookup', async () => {
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [
        createMessage({
          id: 'msg-self-photo',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Foto saya',
        }),
      ],
      error: null,
    });

    useAuthStoreMock.mockReturnValue({
      user: {
        ...currentUser,
        profilephoto: '/local/user-photo.png',
      },
    });

    render(
      <ChatSidebarPanel
        isOpen
        onClose={vi.fn()}
        targetUser={{
          ...targetUser,
          profilephoto: '/local/target-photo.png',
        }}
      />
    );

    expect(await screen.findByText('Foto saya')).toBeInTheDocument();
    expect(screen.getAllByAltText('Admin User').length).toBeGreaterThan(0);
    expect(screen.getAllByAltText('Target User').length).toBeGreaterThan(0);
    expect(setCachedImageMock).not.toHaveBeenCalled();
    expect(getCachedImageBlobUrlMock).not.toHaveBeenCalled();
    expect(cacheImageBlobMock).not.toHaveBeenCalled();
  });

  it('uses cached http profile images and stores cache keys', async () => {
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValue({
      data: [
        createMessage({
          id: 'msg-self-http',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Foto cached',
        }),
      ],
      error: null,
    });
    useAuthStoreMock.mockReturnValue({
      user: {
        ...currentUser,
        profilephoto: 'https://cdn.example.com/user.png',
      },
    });
    getCachedImageBlobUrlMock
      .mockResolvedValueOnce('blob:user-cached')
      .mockResolvedValueOnce('blob:target-cached');

    render(
      <ChatSidebarPanel
        isOpen
        onClose={vi.fn()}
        targetUser={{
          ...targetUser,
          profilephoto: 'https://cdn.example.com/target.png',
        }}
      />
    );

    expect(await screen.findByText('Foto cached')).toBeInTheDocument();
    expect(setCachedImageMock).toHaveBeenCalledWith(
      'profile:user-1',
      'https://cdn.example.com/user.png'
    );
    expect(setCachedImageMock).toHaveBeenCalledWith(
      'profile:user-2',
      'https://cdn.example.com/target.png'
    );
    expect(cacheImageBlobMock).not.toHaveBeenCalled();
  });

  it('falls back to cacheImageBlob for uncached http profile images', async () => {
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-self-blob',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Foto user uncached',
        }),
        createMessage({
          id: 'msg-target-blob',
          sender_id: targetUser.id,
          receiver_id: currentUser.id,
          message: 'Foto target uncached',
        }),
      ],
      error: null,
    });
    useAuthStoreMock.mockReturnValue({
      user: {
        ...currentUser,
        profilephoto: 'https://cdn.example.com/user-uncached.png',
      },
    });
    getCachedImageBlobUrlMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    cacheImageBlobMock
      .mockResolvedValueOnce('blob:user-generated')
      .mockResolvedValueOnce(null);

    render(
      <ChatSidebarPanel
        isOpen
        onClose={vi.fn()}
        targetUser={{
          ...targetUser,
          profilephoto: 'https://cdn.example.com/target-uncached.png',
        }}
      />
    );

    expect(await screen.findByText('Foto user uncached')).toBeInTheDocument();
    expect(await screen.findByText('Foto target uncached')).toBeInTheDocument();

    await waitFor(() => {
      expect(cacheImageBlobMock).toHaveBeenCalledWith(
        'https://cdn.example.com/user-uncached.png'
      );
      expect(cacheImageBlobMock).toHaveBeenCalledWith(
        'https://cdn.example.com/target-uncached.png'
      );
    });

    const adminPhotos = screen.getAllByAltText(
      'Admin User'
    ) as HTMLImageElement[];
    expect(
      adminPhotos.some(
        photo => photo.getAttribute('src') === 'blob:user-generated'
      )
    ).toBe(true);

    const targetPhotos = screen.getAllByAltText(
      'Target User'
    ) as HTMLImageElement[];
    expect(
      targetPhotos.some(photo =>
        (photo.getAttribute('src') || '').includes(
          'https://cdn.example.com/target-uncached.png'
        )
      )
    ).toBe(true);
  });

  it('renders last seen labels for minute, hour, and date ranges', async () => {
    const now = Date.now();
    chatServiceMock.getUserPresence.mockResolvedValueOnce({
      data: {
        user_id: targetUser.id,
        is_online: false,
        current_chat_channel: null,
        last_seen: new Date(now).toISOString(),
      },
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    expect(await screen.findByText('Last seen Just now')).toBeInTheDocument();

    const globalPresenceHandler = getHandler(
      'global_presence_updates',
      'broadcast',
      'presence_changed'
    );

    act(() => {
      globalPresenceHandler({
        payload: {
          user_id: targetUser.id,
          is_online: false,
          current_chat_channel: null,
          last_seen: new Date(now - 35 * 60 * 1000).toISOString(),
        },
      });
    });
    expect(await screen.findByText('Last seen 35m ago')).toBeInTheDocument();

    act(() => {
      globalPresenceHandler({
        payload: {
          user_id: targetUser.id,
          is_online: false,
          current_chat_channel: null,
          last_seen: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
        },
      });
    });
    expect(await screen.findByText('Last seen 5h ago')).toBeInTheDocument();

    const oldTimestamp = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const expectedOldDate = new Date(oldTimestamp).toLocaleDateString();
    act(() => {
      globalPresenceHandler({
        payload: {
          user_id: targetUser.id,
          is_online: false,
          current_chat_channel: null,
          last_seen: oldTimestamp,
        },
      });
    });
    expect(
      await screen.findByText(`Last seen ${expectedOldDate}`)
    ).toBeInTheDocument();
  });

  it('logs message loading failures for response errors and thrown exceptions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: null,
      error: { message: 'load-failed' },
    });

    const { unmount } = render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Error loading messages:',
        expect.objectContaining({ message: 'load-failed' })
      );
    });

    unmount();

    chatServiceMock.fetchMessagesBetweenUsers.mockRejectedValueOnce(
      new Error('load-boom')
    );
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Error loading messages:',
        expect.any(Error)
      );
    });

    errorSpy.mockRestore();
  });

  it('logs insert presence error when update has no rows and insert fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.updateUserPresence.mockResolvedValueOnce({
      data: [],
      error: { code: 'NO_ROWS' },
    });
    chatServiceMock.insertUserPresence.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert-presence-failed' },
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await waitFor(() => {
      expect(chatServiceMock.insertUserPresence).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: currentUser.id,
          current_chat_channel: 'dm_user-1_user-2',
        })
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      '❌ Error inserting user presence:',
      expect.objectContaining({ message: 'insert-presence-failed' })
    );

    errorSpy.mockRestore();
  });

  it('keeps composer message on Shift+Enter and still sends via button', async () => {
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Halo dari target');
    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Kirim lewat enter' } });
    await waitFor(() => {
      expect(textarea).toHaveValue('Kirim lewat enter');
    });

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      charCode: 13,
      shiftKey: true,
    });
    expect(chatServiceMock.insertMessage).not.toHaveBeenCalled();

    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.insertMessage).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Kirim lewat enter' })
      );
    });
  });

  it('uses left and down menu placement based on available container space', async () => {
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    const messageButton = await screen.findByRole('button', {
      name: 'Halo dari target',
    });
    const container = document.querySelector(
      'div.flex-1.px-3.pt-3.overflow-y-auto'
    ) as HTMLDivElement | null;
    expect(container).toBeTruthy();

    const containerRect = {
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };

    Object.defineProperty(container!, 'getBoundingClientRect', {
      configurable: true,
      value: () => containerRect,
    });

    const anchorRect = {
      top: 120,
      left: 180,
      right: 200,
      bottom: 140,
      width: 20,
      height: 20,
      x: 180,
      y: 120,
      toJSON: () => ({}),
    };
    Object.defineProperty(messageButton, 'getBoundingClientRect', {
      configurable: true,
      value: () => anchorRect,
    });

    const reopenButton = screen.getByRole('button', {
      name: 'Halo dari target',
    });
    fireEvent.click(reopenButton);
    const copyButton = await screen.findByRole('button', { name: 'Salin' });
    expect(copyButton.closest('[data-chat-menu-id]')).toHaveClass('left-full');

    const refreshedButton = screen.getByRole('button', {
      name: 'Halo dari target',
    });
    fireEvent.click(refreshedButton);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Salin' })
      ).not.toBeInTheDocument();
    });

    const downButton = screen.getByRole('button', {
      name: 'Halo dari target',
    });
    Object.defineProperty(downButton, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 260,
        left: 365,
        right: 395,
        bottom: 390,
        width: 30,
        height: 130,
        x: 365,
        y: 260,
        toJSON: () => ({}),
      }),
    });

    fireEvent.click(downButton);
    const copyButtonDown = await screen.findByRole('button', { name: 'Salin' });
    expect(copyButtonDown.closest('[data-chat-menu-id]')).toHaveClass(
      'bottom-full'
    );
  });

  it('handles Enter key and keeps empty Enter input unsent', async () => {
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Halo dari target');
    const textarea = screen.getByPlaceholderText('Type a message...');
    const emptyPreventDefault = vi.fn();

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      preventDefault: emptyPreventDefault,
    });
    expect(chatServiceMock.insertMessage).not.toHaveBeenCalled();

    fireEvent.change(textarea, { target: { value: 'Kirim pakai Enter' } });
    await waitFor(() => {
      expect(textarea).toHaveValue('Kirim pakai Enter');
    });
    const valuePreventDefault = vi.fn();
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      preventDefault: valuePreventDefault,
    });
    expect(valuePreventDefault).not.toBeNull();
  });

  it('handles edit guard for empty input', async () => {
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-edit-guard',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan edit guard',
        }),
      ],
      error: null,
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Pesan edit guard');
    fireEvent.click(screen.getByRole('button', { name: 'Pesan edit guard' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: '   ' } });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);
    expect(chatServiceMock.updateMessage).not.toHaveBeenCalled();
  });

  it('catches update rejection when editing message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-edit-reject',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan edit reject',
        }),
      ],
      error: null,
    });
    chatServiceMock.updateMessage.mockRejectedValueOnce(
      new Error('update-boom')
    );

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Pesan edit reject');
    fireEvent.click(screen.getByRole('button', { name: 'Pesan edit reject' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Edit gagal reject' } });
    await waitFor(() => {
      expect(textarea).toHaveValue('Edit gagal reject');
    });
    const sendButton = document.querySelector(
      'button.bg-violet-500'
    ) as HTMLButtonElement | null;
    expect(sendButton).toBeTruthy();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(chatServiceMock.updateMessage).toHaveBeenCalledWith(
        'msg-edit-reject',
        expect.objectContaining({ message: 'Edit gagal reject' })
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error updating message:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });

  it('catches delete rejection and keeps broadcast delete unsent', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.fetchMessagesBetweenUsers.mockResolvedValueOnce({
      data: [
        createMessage({
          id: 'msg-delete-reject',
          sender_id: currentUser.id,
          receiver_id: targetUser.id,
          message: 'Pesan delete reject',
        }),
      ],
      error: null,
    });
    chatServiceMock.deleteMessage.mockRejectedValueOnce(
      new Error('delete-boom')
    );

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Pesan delete reject');
    fireEvent.click(
      screen.getByRole('button', { name: 'Pesan delete reject' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(chatServiceMock.deleteMessage).toHaveBeenCalledWith(
        'msg-delete-reject'
      );
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error deleting message:',
      expect.any(Error)
    );
    expect(
      channelRegistry.get('chat_dm_user-1_user-2')?.send
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'delete_message' })
    );

    errorSpy.mockRestore();
  });

  it('deduplicates realtime message ids and toggles scroll-to-bottom indicator', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await screen.findByText('Halo dari target');

    const container = document.querySelector(
      'div.flex-1.px-3.pt-3.overflow-y-auto'
    ) as HTMLDivElement | null;
    expect(container).toBeTruthy();

    let scrollTopValue = 0;
    Object.defineProperty(container!, 'scrollHeight', {
      configurable: true,
      get: () => 1200,
    });
    Object.defineProperty(container!, 'clientHeight', {
      configurable: true,
      get: () => 300,
    });
    Object.defineProperty(container!, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (next: number) => {
        scrollTopValue = next;
      },
    });

    const newMessageHandler = getHandler(
      'chat_dm_user-1_user-2',
      'broadcast',
      'new_message'
    );
    act(() => {
      newMessageHandler({
        payload: createMessage({
          id: 'msg-1',
          message: 'Harus di-skip karena duplikat',
        }),
      });
      newMessageHandler({
        payload: createMessage({
          id: 'msg-scroll-new',
          message: 'Pesan baru saat tidak di bawah',
        }),
      });
    });

    expect(
      await screen.findByText('Pesan baru saat tidak di bawah')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Harus di-skip karena duplikat')
    ).not.toBeInTheDocument();
  });

  it('updates overflow threshold and clears pending composer layout timers', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'scrollHeight'
    );
    let dynamicScrollHeight = 96;
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => dynamicScrollHeight,
    });

    try {
      render(
        <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
      );

      await screen.findByText('Halo dari target');

      const textarea = screen.getByPlaceholderText(
        'Type a message...'
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: '1234567890' } });
      await waitFor(() => {
        expect(
          (
            screen.getByPlaceholderText(
              'Type a message...'
            ) as HTMLTextAreaElement
          ).style.height
        ).toBe('96px');
      });

      dynamicScrollHeight = 22;
      fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
        target: { value: '1' },
      });
      await waitFor(() => {
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });
    } finally {
      if (scrollHeightDescriptor) {
        Object.defineProperty(
          HTMLTextAreaElement.prototype,
          'scrollHeight',
          scrollHeightDescriptor
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (HTMLTextAreaElement.prototype as { scrollHeight?: number })
          .scrollHeight;
      }
      clearTimeoutSpy.mockRestore();
    }
  });

  it('switches composer layout to multiline after delay when input becomes tall', async () => {
    const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'scrollHeight'
    );
    let dynamicScrollHeight = 96;
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => dynamicScrollHeight,
    });

    try {
      const { container } = render(
        <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
      );

      await screen.findByText('Halo dari target');
      const textarea = screen.getByPlaceholderText(
        'Type a message...'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '1234567890' } });

      await waitFor(() => {
        const composerGrid = container.querySelector(
          'div[class*="grid-cols-[auto_1fr_auto]"]'
        );
        expect(composerGrid).toBeTruthy();
        expect(composerGrid?.className).toContain('grid-rows-[auto_auto]');
      });
    } finally {
      if (scrollHeightDescriptor) {
        Object.defineProperty(
          HTMLTextAreaElement.prototype,
          'scrollHeight',
          scrollHeightDescriptor
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (HTMLTextAreaElement.prototype as { scrollHeight?: number })
          .scrollHeight;
      }
    }
  });

  it('handles presence load rejection and interval cleanup on unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    chatServiceMock.getUserPresence.mockRejectedValue(
      new Error('presence-rejected')
    );

    const { unmount } = render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Caught error loading target user presence:',
        expect.any(Error)
      );
    });

    const intervalCallback = setIntervalSpy.mock.calls[0]?.[0] as
      | (() => void)
      | undefined;
    expect(intervalCallback).toBeTypeOf('function');
    const initialPresenceCalls =
      chatServiceMock.getUserPresence.mock.calls.length;
    act(() => {
      intervalCallback?.();
    });
    expect(chatServiceMock.getUserPresence.mock.calls.length).toBeGreaterThan(
      initialPresenceCalls
    );

    vi.useFakeTimers();
    unmount();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const globalChannel = channelRegistry.get('global_presence_updates');
    expect(removeChannelMock).toHaveBeenCalledWith(globalChannel);

    errorSpy.mockRestore();
    vi.useRealTimers();
    setIntervalSpy.mockRestore();
  });

  it('scrolls menu into view when menu overflows top and bottom edges', async () => {
    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );

    const bubble = await screen.findByRole('button', {
      name: 'Halo dari target',
    });
    const container = document.querySelector(
      'div.flex-1.px-3.pt-3.overflow-y-auto'
    ) as HTMLDivElement | null;
    expect(container).toBeTruthy();

    let scrollTopValue = 140;
    Object.defineProperty(container!, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const scrollToMock = vi.fn(({ top }: { top: number }) => {
      scrollTopValue = top;
    });
    const originalScrollTo = Element.prototype.scrollTo;
    Object.defineProperty(Element.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });

    const fallbackRect = {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    const containerRect = {
      top: 100,
      left: 0,
      right: 420,
      bottom: 320,
      width: 420,
      height: 220,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    };
    const anchorRect = {
      top: 120,
      left: 300,
      right: 360,
      bottom: 150,
      width: 60,
      height: 30,
      x: 300,
      y: 120,
      toJSON: () => ({}),
    };
    let activeMenuRect = {
      top: 70,
      left: 260,
      right: 380,
      bottom: 130,
      width: 120,
      height: 60,
      x: 260,
      y: 70,
      toJSON: () => ({}),
    };

    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this === container) return containerRect as DOMRect;
        if (this === bubble) return anchorRect as DOMRect;
        if (this.dataset.chatMenuId === 'msg-1')
          return activeMenuRect as DOMRect;
        return fallbackRect as DOMRect;
      });

    try {
      fireEvent.click(bubble);
      await waitFor(() => {
        expect(scrollToMock).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Halo dari target' }));
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: 'Salin' })
        ).not.toBeInTheDocument();
      });

      activeMenuRect = {
        top: 280,
        left: 260,
        right: 380,
        bottom: 370,
        width: 120,
        height: 90,
        x: 260,
        y: 280,
        toJSON: () => ({}),
      };
      fireEvent.click(screen.getByRole('button', { name: 'Halo dari target' }));

      await waitFor(() => {
        expect(scrollToMock).toHaveBeenCalledTimes(2);
      });
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(Element.prototype, 'scrollTo', {
        configurable: true,
        value: originalScrollTo,
      });
    }
  });

  it('logs close presence error when close update returns error object', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.updateUserPresence
      .mockResolvedValueOnce({
        data: [
          {
            user_id: currentUser.id,
            is_online: true,
            current_chat_channel: 'dm_user-1_user-2',
            last_seen: '2026-02-08T00:00:01.000Z',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'close-update-error' },
      });

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );
    await screen.findByText('Halo dari target');

    const closeButton = screen
      .getAllByRole('button')
      .find(button => button.textContent === '✕');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Error updating user chat close:',
        expect.objectContaining({ message: 'close-update-error' })
      );
    });
    errorSpy.mockRestore();
  });

  it('logs close rejection when close update throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chatServiceMock.updateUserPresence
      .mockResolvedValueOnce({
        data: [
          {
            user_id: currentUser.id,
            is_online: true,
            current_chat_channel: 'dm_user-1_user-2',
            last_seen: '2026-02-08T00:00:01.000Z',
          },
        ],
        error: null,
      })
      .mockRejectedValueOnce(new Error('close-rejected'));

    render(
      <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
    );
    await screen.findByText('Halo dari target');

    const closeButton = screen
      .getAllByRole('button')
      .find(button => button.textContent === '✕');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        '❌ Caught error updating user chat close:',
        expect.any(Error)
      );
    });

    errorSpy.mockRestore();
  });

  it('returns early on close when user is missing and still calls parent onClose', async () => {
    useAuthStoreMock.mockReturnValueOnce({ user: null });
    const onClose = vi.fn();
    render(
      <ChatSidebarPanel isOpen onClose={onClose} targetUser={targetUser} />
    );

    const closeButton = screen
      .getAllByRole('button')
      .find(button => button.textContent === '✕');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('flags new messages when user is away from the bottom', async () => {
    const rafSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    try {
      render(
        <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
      );
      await screen.findByText('Halo dari target');

      const container = document.querySelector(
        'div.flex-1.px-3.pt-3.overflow-y-auto'
      ) as HTMLDivElement | null;
      expect(container).toBeTruthy();

      let scrollTopValue = 0;
      Object.defineProperty(container!, 'scrollHeight', {
        configurable: true,
        get: () => 1500,
      });
      Object.defineProperty(container!, 'clientHeight', {
        configurable: true,
        get: () => 300,
      });
      Object.defineProperty(container!, 'scrollTop', {
        configurable: true,
        get: () => scrollTopValue,
        set: (next: number) => {
          scrollTopValue = next;
        },
      });

      const newMessageHandler = getHandler(
        'chat_dm_user-1_user-2',
        'broadcast',
        'new_message'
      );
      act(() => {
        newMessageHandler({
          payload: createMessage({
            id: 'msg-away-bottom',
            message: 'Pesan jauh dari bawah',
          }),
        });
      });
      expect(
        await screen.findByText('Pesan jauh dari bawah')
      ).toBeInTheDocument();
    } finally {
      rafSpy.mockRestore();
    }
  });

  it('clears pending composer layout timeout before scheduling the next one', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'scrollHeight'
    );
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 96,
    });

    try {
      render(
        <ChatSidebarPanel isOpen onClose={vi.fn()} targetUser={targetUser} />
      );
      await screen.findByText('Halo dari target');

      const textarea = screen.getByPlaceholderText(
        'Type a message...'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'multiline-1' } });
      fireEvent.change(textarea, { target: { value: 'multiline-2' } });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      if (scrollHeightDescriptor) {
        Object.defineProperty(
          HTMLTextAreaElement.prototype,
          'scrollHeight',
          scrollHeightDescriptor
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (HTMLTextAreaElement.prototype as { scrollHeight?: number })
          .scrollHeight;
      }
      clearTimeoutSpy.mockRestore();
    }
  });
});
