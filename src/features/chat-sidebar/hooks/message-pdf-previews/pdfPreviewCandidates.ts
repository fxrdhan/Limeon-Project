import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreviewCacheEntry } from '../../utils/chatRuntimeCache';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  type ResolvedPdfMessagePreviewAssetEntry,
  isResolvedPdfMessagePreviewAssetFresh,
} from '../../utils/pdf-message-preview';
import { PDF_PREVIEW_MAX_RETRY_ATTEMPTS } from './constants';
import type { PdfPreviewMessageAccessors } from './pdfPreviewMessages';
import { getPdfPreviewableMessages } from './pdfPreviewMessages';

export const getPendingPdfPreviewAssetMessages = ({
  accessors,
  messages,
  pdfMessagePreviews,
  resolvedPdfPreviewAssetEntries,
}: {
  accessors: PdfPreviewMessageAccessors;
  messages: ChatMessage[];
  pdfMessagePreviews: Record<string, PdfMessagePreviewCacheEntry>;
  resolvedPdfPreviewAssetEntries: Record<
    string,
    ResolvedPdfMessagePreviewAssetEntry
  >;
}) =>
  getPdfPreviewableMessages(messages, accessors)
    .filter(({ cacheKey, message }) => {
      if (!message.file_preview_url?.trim()) return false;
      if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) return false;
      if (chatRuntime.pdfPreviews.get(cacheKey)) return false;

      return (
        resolvedPdfPreviewAssetEntries[message.id]?.cacheKey !== cacheKey ||
        !isResolvedPdfMessagePreviewAssetFresh(
          resolvedPdfPreviewAssetEntries[message.id]
        )
      );
    })
    .map(({ message }) => message)
    .slice()
    .reverse();

export const getPendingPdfRenderMessages = ({
  accessors,
  messages,
  pdfMessagePreviews,
  renderingMessageIds,
  retryAttemptsByMessageId,
  retryTimersByMessageId,
}: {
  accessors: PdfPreviewMessageAccessors;
  messages: ChatMessage[];
  pdfMessagePreviews: Record<string, PdfMessagePreviewCacheEntry>;
  renderingMessageIds: Set<string>;
  retryAttemptsByMessageId: Map<string, number>;
  retryTimersByMessageId: Map<string, number>;
}) =>
  getPdfPreviewableMessages(messages, accessors)
    .filter(({ cacheKey, message }) => {
      if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) return false;
      if (chatRuntime.pdfPreviews.get(cacheKey)) return false;
      if (renderingMessageIds.has(message.id)) return false;
      if (retryTimersByMessageId.has(message.id)) return false;
      if (
        (retryAttemptsByMessageId.get(message.id) ?? 0) >=
        PDF_PREVIEW_MAX_RETRY_ATTEMPTS
      ) {
        return false;
      }

      return true;
    })
    .map(({ message }) => message)
    .slice()
    .reverse();
