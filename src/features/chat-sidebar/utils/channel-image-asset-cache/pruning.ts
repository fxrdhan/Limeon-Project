import type { PersistedChannelImageAssetRecord } from './types';

export const getChannelImageAssetKeysToPrune = ({
  budgetBytes,
  protectedAssetKey,
  records,
}: {
  budgetBytes: number;
  protectedAssetKey?: string | null;
  records: PersistedChannelImageAssetRecord[];
}) => {
  let totalBytes = records.reduce(
    (totalSize, record) => totalSize + record.byteSize,
    0
  );
  if (totalBytes <= budgetBytes) {
    return [];
  }

  const assetKeysToDelete: string[] = [];
  const deletableRecords = records
    .filter(record => record.key !== protectedAssetKey)
    .sort(
      (leftRecord, rightRecord) =>
        leftRecord.lastAccessedAt - rightRecord.lastAccessedAt
    );

  for (const record of deletableRecords) {
    if (totalBytes <= budgetBytes) {
      break;
    }

    totalBytes -= record.byteSize;
    assetKeysToDelete.push(record.key);
  }

  return assetKeysToDelete;
};
