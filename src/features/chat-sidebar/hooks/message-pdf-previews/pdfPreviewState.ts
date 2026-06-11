import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreviewCacheEntry } from '../../utils/chatRuntimeCache';
import { chatRuntime } from '../../utils/chatRuntime';
import {
  buildPdfMessagePreviewCacheKey,
  type ResolvedPdfMessagePreviewAssetEntry,
  isResolvedPdfMessagePreviewAssetFresh,
} from '../../utils/pdf-message-preview';
import type { PdfPreviewMessageAccessors } from './pdfPreviewMessages';
import { getPdfPreviewableMessages } from './pdfPreviewMessages';

export const prunePdfMessagePreviews = ({
  accessors,
  messages,
  previousPreviews,
}: {
  accessors: PdfPreviewMessageAccessors;
  messages: ChatMessage[];
  previousPreviews: Record<string, PdfMessagePreviewCacheEntry>;
}) => {
  let hasChanges = false;
  const nextPreviews: Record<string, PdfMessagePreviewCacheEntry> = {};

  for (const { cacheKey, message } of getPdfPreviewableMessages(
    messages,
    accessors
  )) {
    const existingPreview = previousPreviews[message.id];

    if (existingPreview?.cacheKey === cacheKey) {
      nextPreviews[message.id] = existingPreview;
      continue;
    }

    const cachedPreview = chatRuntime.pdfPreviews.get(cacheKey);
    if (cachedPreview) {
      nextPreviews[message.id] = cachedPreview;
      hasChanges = true;
      continue;
    }

    if (existingPreview) {
      hasChanges = true;
    }
  }

  if (
    Object.keys(nextPreviews).length !== Object.keys(previousPreviews).length
  ) {
    hasChanges = true;
  }

  return hasChanges ? nextPreviews : previousPreviews;
};

export const pruneResolvedPdfPreviewAssetEntries = ({
  accessors,
  messages,
  pdfMessagePreviews,
  previousEntries,
}: {
  accessors: PdfPreviewMessageAccessors;
  messages: ChatMessage[];
  pdfMessagePreviews: Record<string, PdfMessagePreviewCacheEntry>;
  previousEntries: Record<string, ResolvedPdfMessagePreviewAssetEntry>;
}) => {
  let hasChanges = false;
  const nextEntries: Record<string, ResolvedPdfMessagePreviewAssetEntry> = {};

  for (const { cacheKey, message } of getPdfPreviewableMessages(
    messages,
    accessors
  )) {
    const existingEntry = previousEntries[message.id];
    if (!existingEntry || existingEntry.cacheKey !== cacheKey) {
      if (existingEntry) {
        hasChanges = true;
      }
      continue;
    }

    if (pdfMessagePreviews[message.id]?.cacheKey === cacheKey) {
      hasChanges = true;
      continue;
    }

    if (chatRuntime.pdfPreviews.get(cacheKey)) {
      hasChanges = true;
      continue;
    }

    if (!isResolvedPdfMessagePreviewAssetFresh(existingEntry)) {
      hasChanges = true;
      continue;
    }

    nextEntries[message.id] = existingEntry;
  }

  if (Object.keys(nextEntries).length !== Object.keys(previousEntries).length) {
    hasChanges = true;
  }

  return hasChanges ? nextEntries : previousEntries;
};

export const getPdfMessagePreviewFromState = ({
  message,
  fileName,
  pdfMessagePreviews,
  resolvedPdfPreviewAssetEntries,
}: {
  fileName: string | null;
  message: ChatMessage;
  pdfMessagePreviews: Record<string, PdfMessagePreviewCacheEntry>;
  resolvedPdfPreviewAssetEntries: Record<
    string,
    ResolvedPdfMessagePreviewAssetEntry
  >;
}) => {
  const cacheKey = buildPdfMessagePreviewCacheKey(message, fileName);
  const localPreview = pdfMessagePreviews[message.id];
  if (localPreview?.cacheKey === cacheKey) {
    return localPreview;
  }

  const cachedPreview = chatRuntime.pdfPreviews.get(cacheKey);
  if (cachedPreview) {
    return cachedPreview;
  }

  const resolvedPreviewAsset = resolvedPdfPreviewAssetEntries[message.id];
  if (
    resolvedPreviewAsset?.cacheKey === cacheKey &&
    isResolvedPdfMessagePreviewAssetFresh(resolvedPreviewAsset)
  ) {
    return resolvedPreviewAsset;
  }

  return undefined;
};
