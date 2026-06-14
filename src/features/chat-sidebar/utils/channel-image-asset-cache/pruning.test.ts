import { describe, expect, it } from 'vite-plus/test';
import { getChannelImageAssetKeysToPrune } from './pruning';
import type { PersistedChannelImageAssetRecord } from './types';

const record = ({
  byteSize,
  key,
  lastAccessedAt,
}: {
  byteSize: number;
  key: string;
  lastAccessedAt: number;
}): PersistedChannelImageAssetRecord => ({
  blob: new Blob(['x'.repeat(byteSize)]),
  byteSize,
  channelId: 'channel-1',
  key,
  lastAccessedAt,
  messageId: key,
  mimeType: 'image/webp',
  updatedAt: lastAccessedAt,
  variant: 'full',
});

describe('channel image asset pruning', () => {
  it('does not prune when records fit within the budget', () => {
    expect(
      getChannelImageAssetKeysToPrune({
        budgetBytes: 100,
        records: [record({ key: 'a', byteSize: 40, lastAccessedAt: 1 })],
      })
    ).toEqual([]);
  });

  it('prunes least recently accessed records until the budget is satisfied', () => {
    expect(
      getChannelImageAssetKeysToPrune({
        budgetBytes: 100,
        records: [
          record({ key: 'newest', byteSize: 70, lastAccessedAt: 30 }),
          record({ key: 'oldest', byteSize: 40, lastAccessedAt: 10 }),
          record({ key: 'middle', byteSize: 40, lastAccessedAt: 20 }),
        ],
      })
    ).toEqual(['oldest', 'middle']);
  });

  it('does not prune the protected asset key', () => {
    expect(
      getChannelImageAssetKeysToPrune({
        budgetBytes: 100,
        protectedAssetKey: 'oldest',
        records: [
          record({ key: 'oldest', byteSize: 80, lastAccessedAt: 10 }),
          record({ key: 'middle', byteSize: 40, lastAccessedAt: 20 }),
          record({ key: 'newest', byteSize: 40, lastAccessedAt: 30 }),
        ],
      })
    ).toEqual(['middle', 'newest']);
  });
});
