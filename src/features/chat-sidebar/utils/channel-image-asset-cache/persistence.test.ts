import { describe, expect, it } from 'vite-plus/test';
import {
  normalizePersistedChannelImageAssetRecord,
  normalizePersistedChannelImageAssetRecords,
} from './persistence';

const validRecord = {
  blob: new Blob(['image'], { type: 'image/png' }),
  byteSize: 5,
  channelId: 'channel-1',
  key: 'channel-1:message-1:thumbnail',
  lastAccessedAt: 20,
  messageId: 'message-1',
  mimeType: 'image/png',
  updatedAt: 10,
  variant: 'thumbnail',
};

describe('channel image asset persistence', () => {
  it('normalizes valid persisted image asset records', () => {
    expect(normalizePersistedChannelImageAssetRecord(validRecord)).toEqual(
      validRecord
    );
  });

  it('drops malformed persisted image asset records', () => {
    expect(
      normalizePersistedChannelImageAssetRecords([
        validRecord,
        { ...validRecord, blob: {} },
        { ...validRecord, variant: 'preview' },
        { ...validRecord, channelId: '' },
        null,
      ])
    ).toEqual([validRecord]);
  });
});
