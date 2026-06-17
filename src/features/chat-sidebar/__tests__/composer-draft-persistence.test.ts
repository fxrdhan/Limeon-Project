import { describe, expect, it } from 'vite-plus/test';
import {
  prunePersistedComposerDraftAttachmentRecords,
  prunePersistedComposerDraftMessageStore,
  type PersistedComposerDraftAttachmentRecord,
  type PersistedComposerDraftRecord,
} from '../utils/composer-draft-persistence';
import { normalizePersistedComposerDraftRecords } from '../utils/composer-draft-persistence/attachments';

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

  it('drops malformed persisted message draft stores', () => {
    const result = prunePersistedComposerDraftMessageStore('not-a-store');

    expect(result.didPrune).toBe(true);
    expect(result.store).toEqual({});
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

  it('normalizes persisted attachment records from IndexedDB payloads', () => {
    const blob = new Blob(['image'], { type: 'image/png' });

    expect(
      normalizePersistedComposerDraftRecords([
        {
          channelId: ' channel-1 ',
          updatedAt: 100,
          attachments: [
            {
              id: 'attachment-1',
              file: blob,
              fileKind: 'image',
              fileName: 'image.png',
              fileTypeLabel: 'PNG',
              mimeType: 'image/png',
              pdfCoverUrl: null,
              pdfPageCount: null,
            },
            {
              id: 'attachment-2',
              file: {},
              fileKind: 'image',
            },
          ],
        },
        {
          channelId: 'channel-2',
          updatedAt: 200,
          attachments: [{ file: blob, fileKind: 'unknown' }],
        },
      ])
    ).toEqual([
      {
        channelId: 'channel-1',
        updatedAt: 100,
        attachments: [
          {
            id: 'attachment-1',
            file: blob,
            fileKind: 'image',
            fileName: 'image.png',
            fileTypeLabel: 'PNG',
            mimeType: 'image/png',
            pdfCoverUrl: null,
            pdfPageCount: null,
          },
        ],
      },
    ]);
  });
});
