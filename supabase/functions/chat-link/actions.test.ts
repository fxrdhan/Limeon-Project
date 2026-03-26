import { describe, expect, it, vi } from 'vite-plus/test';
import {
  createChatSharedLink,
  redirectChatSharedLink,
  type ChatLinkMessageRecord,
  type ChatLinkRepository,
  type ChatSharedLinkRecord,
} from './actions.ts';

const USER_ID = 'user-1';

const buildAttachment = (
  overrides: Partial<ChatLinkMessageRecord> = {}
): ChatLinkMessageRecord => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? USER_ID,
  receiver_id: overrides.receiver_id ?? 'user-2',
  message_type: overrides.message_type ?? 'image',
  file_storage_path:
    overrides.file_storage_path ?? 'images/channel/user-1_image.png',
  shared_link_slug:
    'shared_link_slug' in overrides ? overrides.shared_link_slug ?? null : null,
});

const buildSharedLink = (
  overrides: Partial<ChatSharedLinkRecord> = {}
): ChatSharedLinkRecord => ({
  id: overrides.id ?? 'link-1',
  slug: overrides.slug ?? 'abcd2345ef',
  storage_path:
    'storage_path' in overrides
      ? (overrides.storage_path ?? null)
      : 'images/channel/user-1_image.png',
  message_id:
    'message_id' in overrides ? (overrides.message_id ?? null) : null,
  revoked_at: overrides.revoked_at ?? null,
});

const createRepository = (overrides: {
  attachment?: ChatLinkMessageRecord | null;
  attachmentError?: string | null;
  existingLink?: ChatSharedLinkRecord | null;
  existingLinkError?: string | null;
  createdLink?: ChatSharedLinkRecord | null;
  createError?: string | null;
  createErrorCode?: string | null;
  signedUrl?: string | null;
  signedUrlError?: string | null;
} = {}) => {
  const repository: ChatLinkRepository = {
    getAccessibleAttachmentByMessageId: vi.fn(async () => ({
      attachment: overrides.attachment ?? buildAttachment(),
      error: overrides.attachmentError ?? null,
    })),
    getAccessibleAttachmentByStoragePath: vi.fn(async () => ({
      attachment: overrides.attachment ?? buildAttachment(),
      error: overrides.attachmentError ?? null,
    })),
    getActiveSharedLinkByMessageId: vi.fn(async () => ({
      link:
        overrides.existingLink?.message_id ||
        overrides.createdLink?.message_id
          ? overrides.existingLink ??
            overrides.createdLink ??
            null
          : null,
      error: overrides.existingLinkError ?? null,
    })),
    getActiveSharedLinkByStoragePath: vi.fn(async () => ({
      link: overrides.existingLink ?? null,
      error: overrides.existingLinkError ?? null,
    })),
    getActiveSharedLinkBySlug: vi.fn(async () => ({
      link: overrides.existingLink ?? buildSharedLink(),
      error: overrides.existingLinkError ?? null,
    })),
    createSharedLink: vi.fn(async ({ slug, storagePath }) => ({
      link:
        overrides.createdLink ??
        buildSharedLink({
          slug,
          storage_path: storagePath ?? null,
          message_id: null,
        }),
      error: overrides.createError ?? null,
      errorCode: overrides.createErrorCode ?? null,
    })),
    assignSharedLinkToMessage: vi.fn(async () => ({
      error: null,
    })),
    syncAttachmentSharedLinkSlug: vi.fn(async () => ({
      error: null,
    })),
    touchSharedLinkAccess: vi.fn(async () => {}),
    createSignedAssetUrl: vi.fn(async () => ({
      signedUrl:
        overrides.signedUrl ??
        'https://example.supabase.co/storage/v1/object/sign/chat/images/channel/user-1_image.png?token=abc',
      error: overrides.signedUrlError ?? null,
    })),
  };

  return repository;
};

describe('chat-link actions', () => {
  it('creates a short link for an accessible attachment path', async () => {
    const repository = createRepository({
      existingLink: null,
    });

    const result = await createChatSharedLink({
      repository,
      requestUrl: 'https://project.supabase.co/functions/v1/chat-link',
      userId: USER_ID,
      storagePath: 'images/channel/user-1_image.png',
    });

    expect(result.status).toBe(200);
    expect('shortUrl' in result.body && result.body.shortUrl).toMatch(
      /^https:\/\/project\.supabase\.co\/functions\/v1\/chat-link\/[23456789abcdefghjkmnpqrstuvwxyz]{10}$/
    );
    expect(repository.createSharedLink).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing active short link for the same storage path', async () => {
    const repository = createRepository({
      existingLink: buildSharedLink({
        slug: 'reus2345kq',
      }),
    });

    const result = await createChatSharedLink({
      repository,
      requestUrl: 'https://project.supabase.co/functions/v1/chat-link',
      userId: USER_ID,
      storagePath: 'images/channel/user-1_image.png',
    });

    expect(result).toEqual({
      status: 200,
      body: {
        slug: 'reus2345kq',
        shortUrl:
          'https://project.supabase.co/functions/v1/chat-link/reus2345kq',
        storagePath: 'images/channel/user-1_image.png',
      },
    });
    expect(repository.createSharedLink).not.toHaveBeenCalled();
  });

  it('reuses an attachment short link by message id and syncs the message slug', async () => {
    const repository = createRepository({
      attachment: buildAttachment({
        id: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
        shared_link_slug: null,
      }),
      existingLink: buildSharedLink({
        slug: 'reus2345kq',
        message_id: '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      }),
    });

    const result = await createChatSharedLink({
      repository,
      requestUrl: 'https://project.supabase.co/functions/v1/chat-link',
      userId: USER_ID,
      messageId: '4A2558E0-91F4-4B7C-830E-8388E6F3050D',
    });

    expect(result).toEqual({
      status: 200,
      body: {
        slug: 'reus2345kq',
        shortUrl:
          'https://project.supabase.co/functions/v1/chat-link/reus2345kq',
        storagePath: 'images/channel/user-1_image.png',
      },
    });
    expect(repository.getAccessibleAttachmentByMessageId).toHaveBeenCalledWith(
      '4a2558e0-91f4-4b7c-830e-8388e6f3050d'
    );
    expect(repository.syncAttachmentSharedLinkSlug).toHaveBeenCalledWith(
      '4a2558e0-91f4-4b7c-830e-8388e6f3050d',
      'reus2345kq'
    );
    expect(repository.createSharedLink).not.toHaveBeenCalled();
  });

  it('rejects shared-link creation when no attachment-backed input is provided', async () => {
    const repository = createRepository({
      existingLink: null,
    });

    const result = await createChatSharedLink({
      repository,
      requestUrl: 'https://project.supabase.co/functions/v1/chat-link',
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: 400,
      body: {
        error: 'messageId or storagePath is required',
      },
    });
    expect(repository.createSharedLink).not.toHaveBeenCalled();
  });

  it('redirects a short link to a fresh signed asset url', async () => {
    const repository = createRepository({
      existingLink: buildSharedLink({
        slug: 'reus2345kq',
      }),
      signedUrl:
        'https://example.supabase.co/storage/v1/object/sign/chat/images/channel/user-1_image.png?token=abc',
    });

    const result = await redirectChatSharedLink({
      repository,
      requestUrl:
        'https://project.supabase.co/functions/v1/chat-link/reus2345kq',
    });

    expect(result).toEqual({
      status: 302,
      redirectUrl:
        'https://example.supabase.co/storage/v1/object/sign/chat/images/channel/user-1_image.png?token=abc',
    });
    expect(repository.touchSharedLinkAccess).toHaveBeenCalledWith('link-1');
  });

  it('does not redirect legacy links without a storage path', async () => {
    const repository = createRepository({
      existingLink: buildSharedLink({
        slug: 'vutb2345kq',
        storage_path: null,
      }),
    });

    const result = await redirectChatSharedLink({
      repository,
      requestUrl:
        'https://project.supabase.co/functions/v1/chat-link/vutb2345kq',
    });

    expect(result).toEqual({
      status: 404,
      body: { error: 'Not found' },
    });
    expect(repository.createSignedAssetUrl).not.toHaveBeenCalled();
    expect(repository.touchSharedLinkAccess).not.toHaveBeenCalled();
  });
});
