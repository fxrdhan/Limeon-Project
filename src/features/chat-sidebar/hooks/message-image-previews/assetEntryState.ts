import {
  getFreshResolvedChatAssetUrl,
  type ResolvedChatAssetUrlEntry,
} from '../../utils/message-file';

export const pruneRecordByActiveIds = <Value>(
  previousRecord: Record<string, Value>,
  activeIds: ReadonlySet<string>
): Record<string, Value> => {
  let hasChanges = false;
  const nextRecord: Record<string, Value> = {};

  Object.entries(previousRecord).forEach(([messageId, value]) => {
    if (!activeIds.has(messageId)) {
      hasChanges = true;
      return;
    }

    nextRecord[messageId] = value as Value;
  });

  return hasChanges ? nextRecord : previousRecord;
};

export const getNextPreviewAssetExpiryAt = (
  previewEntries: Record<string, ResolvedChatAssetUrlEntry>
) =>
  Object.values(previewEntries).reduce<number | null>(
    (closestExpiryAt, previewEntry) => {
      if (previewEntry.expiresAt === null) {
        return closestExpiryAt;
      }

      if (
        closestExpiryAt === null ||
        previewEntry.expiresAt < closestExpiryAt
      ) {
        return previewEntry.expiresAt;
      }

      return closestExpiryAt;
    },
    null
  );

export const pruneExpiredPreviewAssetEntries = (
  previousEntries: Record<string, ResolvedChatAssetUrlEntry>,
  now: number
) => {
  let hasChanges = false;
  const nextEntries: Record<string, ResolvedChatAssetUrlEntry> = {};

  Object.entries(previousEntries).forEach(([messageId, previewEntry]) => {
    if (!getFreshResolvedChatAssetUrl(previewEntry, now)) {
      hasChanges = true;
      return;
    }

    nextEntries[messageId] = previewEntry;
  });

  return hasChanges ? nextEntries : previousEntries;
};
