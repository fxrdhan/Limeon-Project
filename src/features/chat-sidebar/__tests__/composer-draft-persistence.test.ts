import { describe, expect, it } from 'vite-plus/test';
import {
  prunePersistedComposerDraftAttachmentRecords,
  prunePersistedComposerDraftMessageStore,
  type PersistedComposerDraftAttachmentRecord,
  type PersistedComposerDraftRecord,
} from '../utils/composer-draft-persistence';

const buildPersistedAttachment = (
  fileSize: number
): PersistedComposerDraftAttachmentRecord => ({
  id: `attachment-${fileSize}`,
  file: new File(['x'.repeat(fileSize)], `draft-${fileSize}.pdf`, {
    type: 'application/pdf',
  }),
  fileKind: 'document',
  fileName: `draft-${fileSize}.pdf`,
  fileTypeLabel: 'PDF',
  mimeType: 'application/pdf',
  pdfCoverUrl: null,
  pdfPageCount: null,
});

const buildPersistedRecord = ({
  channelId,
  updatedAt,
  fileSize,
}: {
  channelId: string;
  updatedAt: number;
  fileSize: number;
}): PersistedComposerDraftRecord => ({
  channelId,
  updatedAt,
  attachments: [buildPersistedAttachment(fileSize)],
});

describe('composer-draft-persistence', () => {
  it('drops stale and empty message drafts during pruning', () => {
    const now = 50_000;
    const result = prunePersistedComposerDraftMessageStore(
      {
        ' channel-1 ': {
          message: 'stok opname',
          updatedAt: now - 500,
        },
        'channel-2': {
          message: 'draft lama',
          updatedAt: now - 5_000,
        },
        'channel-3': {
          message: '',
          updatedAt: now - 100,
        },
      },
      {
        now,
        maxAgeMs: 1_000,
      }
    );

    expect(result.didPrune).toBe(true);
    expect(result.store).toEqual({
      'channel-1': {
        message: 'stok opname',
        updatedAt: now - 500,
      },
    });
  });

  it('keeps the newest attachment drafts within the configured byte budget', () => {
    const now = 10_000;
    const result = prunePersistedComposerDraftAttachmentRecords(
      [
        buildPersistedRecord({
          channelId: 'channel-newest',
          updatedAt: now - 100,
          fileSize: 4,
        }),
        buildPersistedRecord({
          channelId: 'channel-middle',
          updatedAt: now - 200,
          fileSize: 4,
        }),
        buildPersistedRecord({
          channelId: 'channel-overflow',
          updatedAt: now - 300,
          fileSize: 4,
        }),
        buildPersistedRecord({
          channelId: 'channel-stale',
          updatedAt: now - 5_000,
          fileSize: 4,
        }),
        buildPersistedRecord({
          channelId: 'channel-too-large',
          updatedAt: now - 50,
          fileSize: 6,
        }),
      ],
      {
        now,
        maxAgeMs: 1_000,
        maxChannelBytes: 5,
        maxTotalBytes: 10,
      }
    );

    expect(result.records.map(record => record.channelId)).toEqual([
      'channel-newest',
      'channel-middle',
    ]);
    expect(result.totalBytes).toBe(8);
    expect(result.removedChannelIds).toEqual(
      expect.arrayContaining([
        'channel-overflow',
        'channel-stale',
        'channel-too-large',
      ])
    );
  });
});
