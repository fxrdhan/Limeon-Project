import { describe, expect, it } from 'vite-plus/test';
import {
  normalizePersistedPdfPreviewRecord,
  normalizePersistedPdfPreviewRecords,
} from '../utils/pdf-preview-persistence';

const validRecord = {
  messageId: 'message-1',
  cacheKey: 'cache-1',
  coverDataUrl: 'data:image/png;base64,abc',
  pageCount: 2,
  updatedAt: 10,
};

describe('pdf preview persistence', () => {
  it('normalizes valid persisted preview records', () => {
    expect(normalizePersistedPdfPreviewRecord(validRecord)).toEqual(
      validRecord
    );
  });

  it('drops malformed persisted preview records', () => {
    expect(
      normalizePersistedPdfPreviewRecords([
        validRecord,
        { ...validRecord, messageId: '' },
        { ...validRecord, pageCount: '2' },
        null,
      ])
    ).toEqual([validRecord]);
  });
});
