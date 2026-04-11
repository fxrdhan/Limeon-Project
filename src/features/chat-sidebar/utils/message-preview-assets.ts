import type { ChatMessage } from '../data/chatSidebarGateway';
import { chatRuntime } from './chatRuntime';
import {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
  getCachedResolvedChatAssetUrl,
  isDirectChatAssetUrl,
  resolveChatAssetUrl,
} from './message-file';

export type PreviewableMessage = Pick<
  ChatMessage,
  'id' | 'message' | 'file_storage_path' | 'file_mime_type' | 'file_preview_url'
>;

export type PreviewableImageGroupMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'file_storage_path'
  | 'file_mime_type'
  | 'file_name'
  | 'file_preview_url'
> & {
  previewUrl?: string | null;
};

export type PreviewableDocumentMessage = Pick<
  ChatMessage,
  'message' | 'file_storage_path'
>;

export interface ResolvedPreviewResource {
  previewUrl: string | null;
  revokeOnClose: boolean;
}

export const shouldPreferExternalPdfPreview = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};

export const getChatImagePreviewName = (
  message: Pick<PreviewableImageGroupMessage, 'file_name' | 'message'>,
  fallbackIndex: number
) => {
  const explicitName = message.file_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const pathName = message.message.split('/').pop()?.split('?')[0]?.trim();
  if (pathName) {
    return pathName;
  }

  return `Gambar ${fallbackIndex + 1}`;
};

export const resolveInitialImagePreviewUrl = (
  message: PreviewableMessage,
  currentChannelId: string | null,
  preferredPreviewUrl?: string | null
) => {
  const normalizedPreferredPreviewUrl = preferredPreviewUrl?.trim() || null;
  if (
    normalizedPreferredPreviewUrl &&
    (normalizedPreferredPreviewUrl.startsWith('blob:') ||
      normalizedPreferredPreviewUrl === message.message.trim())
  ) {
    return normalizedPreferredPreviewUrl;
  }

  const normalizedChannelId = currentChannelId?.trim() || null;
  if (normalizedChannelId) {
    const runtimeFullUrl = chatRuntime.imageAssets.getUrl(
      normalizedChannelId,
      message.id,
      'full'
    );
    if (runtimeFullUrl) {
      return runtimeFullUrl;
    }
  }

  const persistedPreviewUrl = message.file_preview_url?.trim() || null;
  const cachedResolvedPreviewUrl = persistedPreviewUrl
    ? getCachedResolvedChatAssetUrl(persistedPreviewUrl, persistedPreviewUrl)
    : null;
  if (cachedResolvedPreviewUrl) {
    return cachedResolvedPreviewUrl;
  }

  if (isDirectChatAssetUrl(message.message)) {
    return message.message;
  }

  return null;
};

export const resolveInitialImageThumbnailUrl = (
  message: PreviewableMessage,
  currentChannelId: string | null,
  preferredPreviewUrl?: string | null
) => {
  const normalizedChannelId = currentChannelId?.trim() || null;
  if (normalizedChannelId) {
    const runtimeThumbnailUrl = chatRuntime.imageAssets.getUrl(
      normalizedChannelId,
      message.id,
      'thumbnail'
    );
    if (runtimeThumbnailUrl) {
      return runtimeThumbnailUrl;
    }
  }

  const persistedPreviewUrl = message.file_preview_url?.trim() || null;
  const cachedResolvedPreviewUrl = persistedPreviewUrl
    ? getCachedResolvedChatAssetUrl(persistedPreviewUrl, persistedPreviewUrl)
    : null;
  if (cachedResolvedPreviewUrl) {
    return cachedResolvedPreviewUrl;
  }

  if (persistedPreviewUrl && isDirectChatAssetUrl(persistedPreviewUrl)) {
    return persistedPreviewUrl;
  }

  const normalizedPreferredPreviewUrl = preferredPreviewUrl?.trim() || null;
  if (
    normalizedPreferredPreviewUrl &&
    (normalizedPreferredPreviewUrl.startsWith('blob:') ||
      normalizedPreferredPreviewUrl === message.message.trim())
  ) {
    return normalizedPreferredPreviewUrl;
  }

  return resolveInitialImagePreviewUrl(
    message,
    currentChannelId,
    normalizedPreferredPreviewUrl
  );
};

export const resolveImagePreviewResource = async ({
  currentChannelId,
  message,
}: {
  currentChannelId: string | null;
  message: PreviewableMessage;
}): Promise<ResolvedPreviewResource> => {
  const normalizedChannelId = currentChannelId?.trim() || null;
  if (normalizedChannelId) {
    const cachedFullUrl = chatRuntime.imageAssets.getUrl(
      normalizedChannelId,
      message.id,
      'full'
    );
    if (cachedFullUrl) {
      return {
        previewUrl: cachedFullUrl,
        revokeOnClose: false,
      };
    }

    return {
      previewUrl: await chatRuntime.imageAssets.ensureUrl(
        normalizedChannelId,
        {
          ...message,
          message_type: 'image',
        },
        'full'
      ),
      revokeOnClose: false,
    };
  }

  let nextPreviewUrl: string | null = null;
  let revokeOnClose = false;

  try {
    const signedUrl = await resolveChatAssetUrl(
      message.message,
      message.file_storage_path
    );
    if (signedUrl) {
      nextPreviewUrl = signedUrl;
    } else {
      const imageBlob = await fetchChatFileBlobWithFallback(
        message.message,
        message.file_storage_path,
        message.file_mime_type
      );

      if (imageBlob) {
        nextPreviewUrl = URL.createObjectURL(imageBlob);
        revokeOnClose = true;
      }
    }
  } catch {
    nextPreviewUrl = null;
    revokeOnClose = false;
  }

  if (!nextPreviewUrl && isDirectChatAssetUrl(message.message)) {
    nextPreviewUrl = message.message;
  }

  return {
    previewUrl: nextPreviewUrl,
    revokeOnClose,
  };
};

export const resolveDocumentPreviewResource = async ({
  forcePdfMime = false,
  message,
}: {
  forcePdfMime?: boolean;
  message: PreviewableDocumentMessage;
}): Promise<ResolvedPreviewResource> => {
  if (!forcePdfMime && isDirectChatAssetUrl(message.message)) {
    return {
      previewUrl: message.message,
      revokeOnClose: false,
    };
  }

  const resolvedAssetUrl = await resolveChatAssetUrl(
    message.message,
    message.file_storage_path
  );
  if (resolvedAssetUrl) {
    return {
      previewUrl: resolvedAssetUrl,
      revokeOnClose: false,
    };
  }

  if (!forcePdfMime) {
    try {
      const fileBlob = await fetchChatFileBlobWithFallback(
        message.message,
        message.file_storage_path
      );
      if (fileBlob) {
        return {
          previewUrl: URL.createObjectURL(fileBlob),
          revokeOnClose: true,
        };
      }
    } catch {
      // Fall through to PDF/blob checks below.
    }
  }

  try {
    const pdfBlob = await fetchPdfBlobWithFallback(
      message.message,
      message.file_storage_path
    );
    if (pdfBlob) {
      return {
        previewUrl: URL.createObjectURL(pdfBlob),
        revokeOnClose: true,
      };
    }
  } catch {
    // Fall through to the direct URL fallback below.
  }

  if (isDirectChatAssetUrl(message.message)) {
    return {
      previewUrl: message.message,
      revokeOnClose: false,
    };
  }

  throw new Error('Document preview is unavailable');
};
