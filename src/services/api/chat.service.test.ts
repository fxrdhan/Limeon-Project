import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const {
  mockSingle,
  mockSelect,
  mockInsert,
  mockFrom,
  mockRpc,
  mockInvoke,
  mockUpdate,
  mockEq,
  mockUpdateSelect,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInvoke: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockUpdateSelect: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    functions: {
      invoke: mockInvoke,
    },
  },
  supabaseAnonKey: 'test-anon-key',
  supabaseUrl: 'https://example.supabase.co',
}));

const buildRpcMessage = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'message-1',
  sender_id: 'user-a',
  receiver_id: 'user-b',
  channel_id: 'dm_user-a_user-b',
  message: 'halo',
  message_type: 'text',
  created_at: '2026-03-09T10:00:00.000Z',
  updated_at: '2026-03-09T10:00:00.000Z',
  is_read: false,
  is_delivered: false,
  reply_to_id: null,
  message_relation_kind: null,
  file_name: null,
  file_kind: undefined,
  file_mime_type: null,
  file_size: null,
  file_storage_path: null,
  file_preview_url: null,
  file_preview_page_count: null,
  file_preview_status: null,
  file_preview_error: null,
  shared_link_slug: null,
  ...overrides,
});

const buildRpcPresence = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'presence-1',
  user_id: 'user-a',
  is_online: true,
  last_seen: '2026-03-09T10:00:00.000Z',
  last_chat_opened: null,
  updated_at: '2026-03-09T10:00:00.000Z',
  ...overrides,
});

const buildDirectoryUser = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: 'user-b',
  name: 'Gudang',
  email: 'gudang@example.com',
  profilephoto: null,
  profilephoto_thumb: null,
  ...overrides,
});

describe('chatService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      select: mockUpdateSelect,
    });
    mockUpdateSelect.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it('edits text messages through the dedicated rpc', async () => {
    const updatedMessage = buildRpcMessage({
      id: 'message-1',
      message: 'edited caption',
    });
    mockRpc.mockResolvedValueOnce({
      data: updatedMessage,
      error: null,
    });
    const { chatService } = await import('./chat.service');

    const result = await chatService.editTextMessage('message-1', {
      message: 'edited caption',
      updated_at: '2026-03-09T10:00:00.000Z',
    });

    expect(mockRpc).toHaveBeenCalledWith('edit_chat_message_text', {
      p_message_id: 'message-1',
      p_message: 'edited caption',
      p_updated_at: '2026-03-09T10:00:00.000Z',
    });
    expect(result).toEqual({
      data: updatedMessage,
      error: null,
    });
  });

  it('loads a single chat message through the dedicated rpc', async () => {
    const message = buildRpcMessage({
      id: 'message-1',
      message: 'hello',
    });
    mockRpc.mockResolvedValueOnce({
      data: message,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getMessageById('message-1');

    expect(mockRpc).toHaveBeenCalledWith('get_chat_message_by_id', {
      p_message_id: 'message-1',
    });
    expect(result).toEqual({
      data: message,
      error: null,
    });
  });

  it('surfaces malformed chat message payloads instead of inventing defaults', async () => {
    mockRpc.mockResolvedValueOnce({
      data: buildRpcMessage({
        sender_id: null,
      }),
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getMessageById('message-1');

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message: 'Chat contract violation: sender_id is required.',
      })
    );
  });

  it('fetches conversation pages through the deterministic pagination rpc', async () => {
    const rpcMessages = [
      buildRpcMessage({
        id: 'message-3',
        created_at: '2026-03-09T10:02:00.000Z',
      }),
      buildRpcMessage({
        id: 'message-2',
        created_at: '2026-03-09T10:01:00.000Z',
      }),
    ];
    mockRpc.mockResolvedValueOnce({
      data: rpcMessages,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.fetchMessagesBetweenUsers('user-b', {
      beforeCreatedAt: '2026-03-09T10:03:00.000Z',
      beforeId: 'message-4',
      limit: 2,
    });

    expect(mockRpc).toHaveBeenCalledWith('fetch_chat_messages_page', {
      p_target_user_id: 'user-b',
      p_before_created_at: '2026-03-09T10:03:00.000Z',
      p_before_id: 'message-4',
      p_limit: 3,
    });
    expect(result).toEqual({
      data: {
        messages: [...rpcMessages].reverse(),
        hasMore: false,
      },
      error: null,
    });
  });

  it('searches conversation matches through the dedicated rpc', async () => {
    const matchedMessages = [
      buildRpcMessage({
        id: 'message-1',
        created_at: '2026-03-10T08:00:00.000Z',
      }),
      buildRpcMessage({
        id: 'message-2',
        created_at: '2026-03-10T08:01:00.000Z',
      }),
    ];
    mockRpc.mockResolvedValueOnce({
      data: [
        ...matchedMessages,
        buildRpcMessage({
          id: 'message-3',
          created_at: '2026-03-10T08:02:00.000Z',
        }),
      ],
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.searchConversationMessages(
      'user-b',
      'stok',
      {
        limit: 2,
        afterCreatedAt: '2026-03-10T07:59:00.000Z',
        afterId: 'message-0',
      }
    );

    expect(mockRpc).toHaveBeenCalledWith('search_chat_messages', {
      p_target_user_id: 'user-b',
      p_query: 'stok',
      p_limit: 3,
      p_after_created_at: '2026-03-10T07:59:00.000Z',
      p_after_id: 'message-0',
    });
    expect(result).toEqual({
      data: {
        messages: matchedMessages,
        hasMore: true,
      },
      error: null,
    });
  });

  it('loads a search context window through the dedicated rpc', async () => {
    const contextMessages = [
      buildRpcMessage({
        id: 'message-10',
        created_at: '2026-03-10T08:00:00.000Z',
      }),
      buildRpcMessage({
        id: 'message-11',
        created_at: '2026-03-10T08:01:00.000Z',
      }),
    ];
    mockRpc.mockResolvedValueOnce({
      data: contextMessages,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.fetchConversationMessageContext(
      'user-b',
      'message-11',
      {
        beforeLimit: 12,
        afterLimit: 6,
      }
    );

    expect(mockRpc).toHaveBeenCalledWith('fetch_chat_message_context', {
      p_target_user_id: 'user-b',
      p_message_id: 'message-11',
      p_before_limit: 12,
      p_after_limit: 6,
    });
    expect(result).toEqual({
      data: contextMessages,
      error: null,
    });
  });

  it('creates chat messages through the dedicated rpc and preserves attachment metadata', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message:
          "Could not find the 'message_relation_kind' column of 'chat_messages' in the schema cache",
      },
    });

    const { chatService } = await import('./chat.service');

    await chatService.insertMessage({
      receiver_id: 'user-b',
      message: 'caption',
      message_type: 'text',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_chat_message', {
      p_receiver_id: 'user-b',
      p_message: 'caption',
      p_message_type: 'text',
      p_reply_to_id: 'file-1',
      p_message_relation_kind: 'attachment_caption',
      p_file_name: null,
      p_file_kind: null,
      p_file_mime_type: null,
      p_file_size: null,
      p_file_storage_path: null,
      p_file_preview_url: null,
      p_file_preview_page_count: null,
      p_file_preview_status: null,
      p_file_preview_error: null,
    });
  });

  it('uses the edge cleanup function when deleting a thread and cleaning files', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        deletedMessageIds: ['message-1'],
        failedStoragePaths: [],
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.deleteMessageThreadAndCleanup('message-1');

    expect(mockInvoke).toHaveBeenCalledWith('chat-cleanup', {
      body: {
        action: 'delete_thread',
        messageId: 'message-1',
      },
    });
    expect(result).toEqual({
      data: {
        deletedMessageIds: ['message-1'],
        failedStoragePaths: [],
      },
      error: null,
    });
  });

  it('loads directory users through the dedicated rpc and enforces the user contract', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        buildDirectoryUser({
          id: 'user-b',
          name: 'Gudang',
        }),
        buildDirectoryUser({
          id: 'user-c',
          name: 'Kasir',
        }),
      ],
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getUsersPage(2, 0);

    expect(mockRpc).toHaveBeenCalledWith('list_chat_directory_users', {
      p_limit: 3,
      p_offset: 0,
    });
    expect(result).toEqual({
      data: {
        users: [
          buildDirectoryUser({
            id: 'user-b',
            name: 'Gudang',
          }),
          buildDirectoryUser({
            id: 'user-c',
            name: 'Kasir',
          }),
        ],
        hasMore: false,
      },
      error: null,
    });
  });

  it('surfaces malformed directory payloads instead of accepting incomplete users', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        buildDirectoryUser({
          email: null,
        }),
      ],
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getUsersPage(30, 0);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message:
          'Chat contract violation: directory_user.email must be a string.',
      })
    );
  });

  it('uses the edge cleanup function once when deleting multiple threads', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        deletedMessageIds: ['message-1', 'message-2'],
        deletedTargetMessageIds: ['message-1'],
        failedTargetMessageIds: ['message-2'],
        cleanupWarningTargetMessageIds: ['message-1'],
        failedStoragePaths: ['documents/channel/user-a_report.pdf'],
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.deleteMessageThreadsAndCleanup([
      'message-1',
      'message-2',
      'message-1',
      '  ',
    ]);

    expect(mockInvoke).toHaveBeenCalledWith('chat-cleanup', {
      body: {
        action: 'delete_threads',
        messageIds: ['message-1', 'message-2'],
      },
    });
    expect(result).toEqual({
      data: {
        deletedMessageIds: ['message-1', 'message-2'],
        deletedTargetMessageIds: ['message-1'],
        failedTargetMessageIds: ['message-2'],
        cleanupWarningTargetMessageIds: ['message-1'],
        failedStoragePaths: ['documents/channel/user-a_report.pdf'],
      },
      error: null,
    });
  });

  it('upserts presence through the dedicated rpc', async () => {
    mockRpc.mockResolvedValueOnce({
      data: buildRpcPresence({
        user_id: 'user-a',
        is_online: true,
      }),
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.upsertUserPresence('user-a', {
      is_online: true,
    });

    expect(mockRpc).toHaveBeenCalledWith('upsert_user_presence', {
      p_user_id: 'user-a',
      p_is_online: true,
      p_last_chat_opened: null,
    });
    expect(result).toEqual({
      data: buildRpcPresence({
        user_id: 'user-a',
        is_online: true,
      }),
      error: null,
    });
  });

  it('loads presence snapshots through the dedicated rpc', async () => {
    const presence = buildRpcPresence({
      user_id: 'user-a',
      is_online: true,
    });
    mockRpc.mockResolvedValueOnce({
      data: presence,
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getUserPresence('user-a');

    expect(mockRpc).toHaveBeenCalledWith('get_user_presence', {
      p_user_id: 'user-a',
    });
    expect(result).toEqual({
      data: presence,
      error: null,
    });
  });

  it('surfaces malformed presence payloads instead of inventing ids or timestamps', async () => {
    mockRpc.mockResolvedValueOnce({
      data: buildRpcPresence({
        id: null,
        last_seen: null,
        updated_at: null,
      }),
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.getUserPresence('user-a');

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message: 'Chat contract violation: presence.id is required.',
      })
    );
  });

  it('pages undelivered incoming message ids through the dedicated rpc', async () => {
    mockRpc.mockResolvedValueOnce({
      data: ['message-1', 'message-2', 'message-3'],
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.listUndeliveredIncomingMessageIds({
      limit: 2,
      offset: 4,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'list_undelivered_incoming_message_ids',
      {
        p_limit: 3,
        p_offset: 4,
      }
    );
    expect(result).toEqual({
      data: {
        messageIds: ['message-1', 'message-2'],
        hasMore: true,
      },
      error: null,
    });
  });

  it('normalizes thrown undelivered-message paging errors at the service boundary', async () => {
    mockRpc.mockRejectedValueOnce(new Error('temporary rpc outage'));

    const { chatService } = await import('./chat.service');

    const result = await chatService.listUndeliveredIncomingMessageIds({
      limit: 2,
    });

    expect(result).toEqual({
      data: null,
      error: expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message: 'temporary rpc outage',
      }),
    });
  });

  it('normalizes thrown thread deletion errors at the service boundary', async () => {
    mockRpc.mockRejectedValueOnce(new Error('delete thread failed'));

    const { chatService } = await import('./chat.service');

    const result = await chatService.deleteMessageThread('message-1');

    expect(result).toEqual({
      data: null,
      error: expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message: 'delete thread failed',
      }),
    });
  });

  it('normalizes standard presence sync behind the rpc-based helper', async () => {
    mockRpc.mockResolvedValueOnce({
      data: buildRpcPresence({
        user_id: 'user-a',
        is_online: false,
      }),
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const didSync = await chatService.syncUserPresenceOnlineState(
      'user-a',
      false
    );

    expect(didSync).toEqual({
      ok: true,
      errorMessage: null,
    });
    expect(mockRpc).toHaveBeenCalledWith('upsert_user_presence', {
      p_user_id: 'user-a',
      p_is_online: false,
      p_last_chat_opened: null,
    });
  });

  it('normalizes cleanup retry results and keeps skipped cleanup failures out of the retry loop', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        resolvedCount: 2,
        remainingCount: 0,
        skippedCount: 1,
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.retryChatCleanupFailures();

    expect(mockInvoke).toHaveBeenCalledWith('chat-cleanup', {
      body: {
        action: 'retry_failures',
      },
    });
    expect(result).toEqual({
      data: {
        resolvedCount: 2,
        remainingCount: 0,
        skippedCount: 1,
      },
      error: null,
    });
  });

  it('surfaces malformed cleanup retry payloads instead of defaulting numeric counters', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        resolvedCount: '2',
        remainingCount: 0,
        skippedCount: 1,
      },
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const result = await chatService.retryChatCleanupFailures();

    expect(result.data).toBeNull();
    expect(result.error).toEqual(
      expect.objectContaining({
        code: 'CHAT_CONTRACT_INVALID',
        message:
          'Chat contract violation: cleanup.resolvedCount must be a non-negative number.',
      })
    );
  });

  it('starts keepalive and fallback update through the page-exit helper', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    mockRpc.mockResolvedValueOnce({
      data: buildRpcPresence({
        user_id: 'user-a',
        is_online: false,
        last_seen: '2026-03-10T12:00:00.000Z',
      }),
      error: null,
    });

    const { chatService } = await import('./chat.service');

    const didStartKeepalive = chatService.syncUserPresenceOnPageExit(
      'user-a',
      'access-token',
      '2026-03-10T12:00:00.000Z'
    );

    expect(didStartKeepalive).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/sync_user_presence_on_exit',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          p_user_id: 'user-a',
          p_is_online: false,
          p_last_seen: '2026-03-10T12:00:00.000Z',
        }),
      })
    );
    expect(mockRpc).toHaveBeenCalledWith('sync_user_presence_on_exit', {
      p_user_id: 'user-a',
      p_is_online: false,
      p_last_seen: '2026-03-10T12:00:00.000Z',
    });
    fetchSpy.mockRestore();
  });

  it('starts keepalive read receipt sync through the rpc endpoint', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));

    const { chatService } = await import('./chat.service');

    const didStartKeepalive = chatService.sendReadReceiptKeepalive(
      ['message-1', 'message-2', 'message-1'],
      'access-token'
    );

    expect(didStartKeepalive).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/mark_chat_message_ids_as_read',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          p_message_ids: ['message-1', 'message-2'],
        }),
      })
    );
    fetchSpy.mockRestore();
  });
});
