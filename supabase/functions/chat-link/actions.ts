import { extractChatStoragePath } from '../../../shared/chatStoragePaths.ts';
import type {
  ChatSharedLinkResponse,
} from '../../../shared/chatFunctionContracts.ts';

const CHAT_LINK_SLUG_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const CHAT_LINK_SLUG_LENGTH = 10;
const CHAT_LINK_SLUG_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{10}$/;
const CHAT_LINK_SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface ChatLinkMessageRecord {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  message_type?: string | null;
  file_storage_path?: string | null;
  shared_link_slug?: string | null;
}

export interface ChatSharedLinkRecord {
  id: string;
  slug: string;
  storage_path?: string | null;
  message_id?: string | null;
  revoked_at?: string | null;
}

export interface ChatLinkRepository {
  getAccessibleAttachmentByMessageId: (messageId: string) => Promise<{
    attachment: ChatLinkMessageRecord | null;
    error: string | null;
  }>;
  getAccessibleAttachmentByStoragePath: (storagePath: string) => Promise<{
    attachment: ChatLinkMessageRecord | null;
    error: string | null;
  }>;
  getActiveSharedLinkByMessageId: (messageId: string) => Promise<{
    link: ChatSharedLinkRecord | null;
    error: string | null;
  }>;
  getActiveSharedLinkByStoragePath: (
    storagePath: string
  ) => Promise<{
    link: ChatSharedLinkRecord | null;
    error: string | null;
  }>;
  getActiveSharedLinkBySlug: (slug: string) => Promise<{
    link: ChatSharedLinkRecord | null;
    error: string | null;
  }>;
  createSharedLink: (params: {
    slug: string;
    storagePath?: string | null;
    messageId?: string | null;
    userId: string;
  }) => Promise<{
    link: ChatSharedLinkRecord | null;
    error: string | null;
    errorCode?: string | null;
  }>;
  assignSharedLinkToMessage: (
    linkId: string,
    messageId: string
  ) => Promise<{
    error: string | null;
  }>;
  syncAttachmentSharedLinkSlug: (
    messageId: string,
    slug: string
  ) => Promise<{
    error: string | null;
  }>;
  touchSharedLinkAccess: (linkId: string) => Promise<void>;
  createSignedAssetUrl: (
    storagePath: string,
    expiresInSeconds: number
  ) => Promise<{
    signedUrl: string | null;
    error: string | null;
  }>;
}

export const normalizeChatLinkStoragePath = (value?: string | null) => {
  const rawValue = value?.trim();
  if (!rawValue) {
    return null;
  }

  const extractedStoragePath = extractChatStoragePath(rawValue);
  const normalizedStoragePath = (extractedStoragePath ?? rawValue).replace(
    /^\/+/,
    ''
  );

  if (
    !normalizedStoragePath ||
    normalizedStoragePath.includes('..') ||
    normalizedStoragePath.includes('\\') ||
    /^https?:\/\//i.test(normalizedStoragePath)
  ) {
    return null;
  }

  return normalizedStoragePath;
};

export const normalizeChatLinkMessageId = (value?: string | null) => {
  const rawValue = value?.trim().toLowerCase();
  if (!rawValue) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    rawValue
  )
    ? rawValue
    : null;
};

export const extractChatLinkSlugFromRequestUrl = (requestUrl: string) => {
  const url = new URL(requestUrl);
  const querySlug = url.searchParams.get('s')?.trim().toLowerCase();
  if (querySlug && CHAT_LINK_SLUG_PATTERN.test(querySlug)) {
    return querySlug;
  }

  const pathSegments = url.pathname.split('/').filter(Boolean);
  const candidateSlug = pathSegments.at(-1)?.trim().toLowerCase() || null;
  if (!candidateSlug || candidateSlug === 'chat-link') {
    return null;
  }

  return CHAT_LINK_SLUG_PATTERN.test(candidateSlug) ? candidateSlug : null;
};

export const buildChatLinkShortUrl = (requestUrl: string, slug: string) => {
  const url = new URL(requestUrl);
  return new URL(`/functions/v1/chat-link/${slug}`, url.origin).toString();
};

export const generateChatLinkSlug = () => {
  const randomBytes = crypto.getRandomValues(
    new Uint8Array(CHAT_LINK_SLUG_LENGTH)
  );

  return Array.from(randomBytes, randomByte =>
    CHAT_LINK_SLUG_ALPHABET[
      randomByte % CHAT_LINK_SLUG_ALPHABET.length
    ]
  ).join('');
};

const buildChatSharedLinkResponse = (
  requestUrl: string,
  link: ChatSharedLinkRecord
) =>
  ({
    slug: link.slug,
    shortUrl: buildChatLinkShortUrl(requestUrl, link.slug),
    storagePath: link.storage_path ?? null,
  }) satisfies ChatSharedLinkResponse;

const syncAttachmentSharedLinkMetadata = async ({
  repository,
  attachment,
  link,
}: {
  repository: ChatLinkRepository;
  attachment: ChatLinkMessageRecord | null;
  link: ChatSharedLinkRecord;
}) => {
  const attachmentMessageId = attachment?.id?.trim();
  if (!attachmentMessageId) {
    return null;
  }

  if (!link.message_id) {
    const { error: assignError } = await repository.assignSharedLinkToMessage(
      link.id,
      attachmentMessageId
    );
    if (assignError) {
      return assignError;
    }
  }

  if (attachment.shared_link_slug !== link.slug) {
    const { error: syncError } = await repository.syncAttachmentSharedLinkSlug(
      attachmentMessageId,
      link.slug
    );
    if (syncError) {
      return syncError;
    }
  }

  return null;
};

export const createChatSharedLink = async ({
  repository,
  requestUrl,
  userId,
  messageId,
  storagePath,
}: {
  repository: ChatLinkRepository;
  requestUrl: string;
  userId: string;
  messageId?: string | null;
  storagePath?: string | null;
}) => {
  const normalizedMessageId = normalizeChatLinkMessageId(messageId);
  let accessibleAttachment: ChatLinkMessageRecord | null = null;

  if (normalizedMessageId) {
    const { attachment, error: attachmentError } =
      await repository.getAccessibleAttachmentByMessageId(normalizedMessageId);
    if (attachmentError) {
      return {
        status: 500,
        body: { error: attachmentError },
      };
    }

    if (!attachment) {
      return {
        status: 403,
        body: { error: 'Forbidden' },
      };
    }

    accessibleAttachment = attachment;
  }

  const normalizedStoragePath = normalizeChatLinkStoragePath(
    accessibleAttachment?.file_storage_path ?? storagePath
  );
  if (normalizedStoragePath) {
    if (!accessibleAttachment) {
      const { attachment, error: attachmentError } =
        await repository.getAccessibleAttachmentByStoragePath(
          normalizedStoragePath
        );
      if (attachmentError) {
        return {
          status: 500,
          body: { error: attachmentError },
        };
      }

      if (!attachment) {
        return {
          status: 403,
          body: { error: 'Forbidden' },
        };
      }

      accessibleAttachment = attachment;
    }

    const attachmentMessageId =
      normalizeChatLinkMessageId(accessibleAttachment.id) ?? normalizedMessageId;

    if (attachmentMessageId) {
      const { link: existingMessageLink, error: existingMessageLinkError } =
        await repository.getActiveSharedLinkByMessageId(attachmentMessageId);
      if (existingMessageLinkError) {
        return {
          status: 500,
          body: { error: existingMessageLinkError },
        };
      }

      if (existingMessageLink) {
        const metadataSyncError = await syncAttachmentSharedLinkMetadata({
          repository,
          attachment: accessibleAttachment,
          link: existingMessageLink,
        });
        if (metadataSyncError) {
          return {
            status: 500,
            body: { error: metadataSyncError },
          };
        }

        return {
          status: 200,
          body: buildChatSharedLinkResponse(requestUrl, existingMessageLink),
        };
      }
    }

    const { link: existingLink, error: existingLinkError } =
      await repository.getActiveSharedLinkByStoragePath(normalizedStoragePath);
    if (existingLinkError) {
      return {
        status: 500,
        body: { error: existingLinkError },
      };
    }

    if (existingLink) {
      const metadataSyncError = await syncAttachmentSharedLinkMetadata({
        repository,
        attachment: accessibleAttachment,
        link: existingLink,
      });
      if (metadataSyncError) {
        return {
          status: 500,
          body: { error: metadataSyncError },
        };
      }

      return {
        status: 200,
        body: buildChatSharedLinkResponse(requestUrl, existingLink),
      };
    }

    for (let attemptIndex = 0; attemptIndex < 6; attemptIndex += 1) {
      const slug = generateChatLinkSlug();
      const { link, error, errorCode } = await repository.createSharedLink({
        slug,
        storagePath: normalizedStoragePath,
        messageId: attachmentMessageId,
        userId,
      });

      if (link) {
        const metadataSyncError = await syncAttachmentSharedLinkMetadata({
          repository,
          attachment: accessibleAttachment,
          link,
        });
        if (metadataSyncError) {
          return {
            status: 500,
            body: { error: metadataSyncError },
          };
        }

        return {
          status: 200,
          body: buildChatSharedLinkResponse(requestUrl, link),
        };
      }

      if (errorCode === '23505') {
        const {
          link: conflictedLinkByMessageId,
          error: conflictedLinkByMessageIdError,
        } = attachmentMessageId
          ? await repository.getActiveSharedLinkByMessageId(attachmentMessageId)
          : { link: null, error: null };

        if (conflictedLinkByMessageIdError) {
          return {
            status: 500,
            body: { error: conflictedLinkByMessageIdError },
          };
        }

        const { link: conflictedLink, error: conflictedLinkError } =
          conflictedLinkByMessageId
            ? { link: conflictedLinkByMessageId, error: null }
            : await repository.getActiveSharedLinkByStoragePath(
                normalizedStoragePath
              );

        if (conflictedLinkError) {
          return {
            status: 500,
            body: { error: conflictedLinkError },
          };
        }

        if (conflictedLink) {
          const metadataSyncError = await syncAttachmentSharedLinkMetadata({
            repository,
            attachment: accessibleAttachment,
            link: conflictedLink,
          });
          if (metadataSyncError) {
            return {
              status: 500,
              body: { error: metadataSyncError },
            };
          }

          return {
            status: 200,
            body: buildChatSharedLinkResponse(requestUrl, conflictedLink),
          };
        }

        continue;
      }

      return {
        status: 500,
        body: { error: error ?? 'Failed to create chat shared link' },
      };
    }

    return {
      status: 500,
      body: { error: 'Failed to create chat shared link' },
    };
  }

  return {
    status: 400,
    body: { error: 'messageId or storagePath is required' },
  };
};

export const redirectChatSharedLink = async ({
  repository,
  requestUrl,
}: {
  repository: ChatLinkRepository;
  requestUrl: string;
}) => {
  const slug = extractChatLinkSlugFromRequestUrl(requestUrl);
  if (!slug) {
    return {
      status: 400,
      body: { error: 'slug is required' },
    };
  }

  const { link, error: linkError } =
    await repository.getActiveSharedLinkBySlug(slug);
  if (linkError) {
    return {
      status: 500,
      body: { error: linkError },
    };
  }

  if (!link || link.revoked_at) {
    return {
      status: 404,
      body: { error: 'Not found' },
    };
  }

  if (!link.storage_path) {
    return {
      status: 404,
      body: { error: 'Not found' },
    };
  }

  const { signedUrl, error: signedUrlError } =
    await repository.createSignedAssetUrl(
      link.storage_path,
      CHAT_LINK_SIGNED_URL_TTL_SECONDS
    );
  if (!signedUrl || signedUrlError) {
    return {
      status: 404,
      body: { error: 'Attachment not found' },
    };
  }

  await repository.touchSharedLinkAccess(link.id);

  return {
    status: 302,
    redirectUrl: signedUrl,
  };
};
