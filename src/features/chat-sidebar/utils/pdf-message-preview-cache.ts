import { PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES } from '../constants';
import {
  pdfMessagePreviewStore,
  type PdfMessagePreviewCacheEntry,
} from './chatRuntimeState';

export type { PdfMessagePreviewCacheEntry } from './chatRuntimeState';

const {
  cache: pdfMessagePreviewCache,
  keysByMessageId: pdfMessagePreviewCacheKeysByMessageId,
} = pdfMessagePreviewStore;

const removeCachedPreviewByKey = (cacheKey: string) => {
  pdfMessagePreviewCache.delete(cacheKey);

  for (const [
    messageId,
    mappedCacheKey,
  ] of pdfMessagePreviewCacheKeysByMessageId) {
    if (mappedCacheKey !== cacheKey) continue;
    pdfMessagePreviewCacheKeysByMessageId.delete(messageId);
    break;
  }
};

export const getCachedPdfMessagePreview = (cacheKey: string) =>
  pdfMessagePreviewCache.get(cacheKey);

export const setCachedPdfMessagePreview = (
  messageId: string,
  preview: PdfMessagePreviewCacheEntry
) => {
  const previousCacheKey = pdfMessagePreviewCacheKeysByMessageId.get(messageId);
  if (previousCacheKey && previousCacheKey !== preview.cacheKey) {
    removeCachedPreviewByKey(previousCacheKey);
  }

  if (pdfMessagePreviewCache.has(preview.cacheKey)) {
    pdfMessagePreviewCache.delete(preview.cacheKey);
  }

  pdfMessagePreviewCache.set(preview.cacheKey, preview);
  pdfMessagePreviewCacheKeysByMessageId.set(messageId, preview.cacheKey);

  while (pdfMessagePreviewCache.size > PDF_MESSAGE_PREVIEW_CACHE_MAX_ENTRIES) {
    const oldestCacheKey = pdfMessagePreviewCache.keys().next().value;
    if (!oldestCacheKey) break;
    removeCachedPreviewByKey(oldestCacheKey);
  }
};

export const pruneCachedPdfMessagePreviews = (
  activeMessageIds: Set<string>
) => {
  for (const [messageId, cacheKey] of pdfMessagePreviewCacheKeysByMessageId) {
    if (activeMessageIds.has(messageId)) continue;
    removeCachedPreviewByKey(cacheKey);
  }
};

export const resetCachedPdfMessagePreviews = () => {
  pdfMessagePreviewCache.clear();
  pdfMessagePreviewCacheKeysByMessageId.clear();
};
