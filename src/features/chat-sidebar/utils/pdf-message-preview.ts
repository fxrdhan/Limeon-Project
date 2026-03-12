import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PdfMessagePreviewCacheEntry } from './chatRuntimeCache';
import {
  fetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback,
  resolveFileExtension,
} from './message-file';
import { renderPdfPreviewBlob, renderPdfPreviewDataUrl } from './pdf-preview';

export const PDF_MESSAGE_PREVIEW_TARGET_WIDTH = 260;

type PdfPreviewableMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_preview_url'
  | 'file_preview_page_count'
  | 'file_preview_status'
  | 'file_storage_path'
  | 'file_size'
>;

export const isPdfPreviewableMessage = (
  message: PdfPreviewableMessage,
  fileName: string | null,
  fileMimeTypeOverride?: string | null
) => {
  if (message.message_type !== 'file') {
    return false;
  }

  const fileMimeType = fileMimeTypeOverride || message.file_mime_type;
  const extension = resolveFileExtension(
    fileName,
    message.message,
    fileMimeType
  );

  return (
    extension === 'pdf' || fileMimeType?.toLowerCase().includes('pdf') === true
  );
};

export const buildPdfMessagePreviewCacheKey = (
  message: PdfPreviewableMessage,
  fileName: string | null
) => {
  const statusPart = message.file_preview_status || '';
  const previewUrlPart = message.file_preview_url || '';
  const pageCountPart =
    typeof message.file_preview_page_count === 'number'
      ? String(message.file_preview_page_count)
      : '';

  return [
    message.id,
    message.message,
    statusPart,
    previewUrlPart,
    pageCountPart,
    message.file_storage_path || '',
    fileName,
    message.file_size ?? '',
    message.file_mime_type ?? '',
  ].join('::');
};

export const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (typeof fileReader.result === 'string') {
        resolve(fileReader.result);
        return;
      }

      reject(new Error('Failed to read preview blob'));
    };
    fileReader.onerror = () => {
      reject(fileReader.error ?? new Error('Failed to read preview blob'));
    };
    fileReader.readAsDataURL(blob);
  });

export const resolvePersistedPdfMessagePreview = async (
  message: PdfPreviewableMessage,
  cacheKey: string
): Promise<PdfMessagePreviewCacheEntry | null> => {
  const persistedPreviewPath = message.file_preview_url?.trim();
  if (!persistedPreviewPath) {
    return null;
  }

  const previewBlob = await fetchChatFileBlobWithFallback(
    persistedPreviewPath,
    persistedPreviewPath,
    'image/png'
  );
  if (!previewBlob) {
    return null;
  }

  return {
    coverDataUrl: await readBlobAsDataUrl(previewBlob),
    pageCount: Math.max(message.file_preview_page_count ?? 1, 1),
    cacheKey,
  };
};

export const renderPdfMessagePreview = async (
  message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
  cacheKey: string
): Promise<PdfMessagePreviewCacheEntry | null> => {
  const pdfBlob = await fetchPdfBlobWithFallback(
    message.message,
    message.file_storage_path
  );
  if (!pdfBlob) {
    return null;
  }

  const renderedPreview = await renderPdfPreviewDataUrl(
    pdfBlob,
    PDF_MESSAGE_PREVIEW_TARGET_WIDTH
  );
  if (!renderedPreview) {
    return null;
  }

  return {
    coverDataUrl: renderedPreview.coverDataUrl,
    pageCount: renderedPreview.pageCount,
    cacheKey,
  };
};

export const createPdfPreviewUploadArtifact = async (
  file: Blob,
  messageId: string
) => {
  const renderedPreview = await renderPdfPreviewBlob(
    file,
    PDF_MESSAGE_PREVIEW_TARGET_WIDTH
  );
  if (!renderedPreview) {
    return null;
  }

  return {
    previewFile: new File(
      [renderedPreview.coverBlob],
      `${messageId}-preview.png`,
      {
        type: 'image/png',
      }
    ),
    pageCount: renderedPreview.pageCount,
  };
};
