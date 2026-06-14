import { describe, expect, it } from 'vite-plus/test';
import type { PendingComposerAttachment } from '../types';
import type { AttachmentComposerRemoteFile } from '../utils/composer-attachment-link';
import {
  buildPendingAttachmentSendPlan,
  buildRemoteComposerAttachment,
  shouldPreappendBulkImageOptimisticBatch,
} from '../hooks/chatComposerSendPlan';

const file = (name: string, type: string) =>
  new File(['attachment'], name, { type });

const pendingAttachment = (
  id: string,
  fileKind: PendingComposerAttachment['fileKind'] = 'image'
): PendingComposerAttachment => ({
  id,
  file: file(
    fileKind === 'image' ? `${id}.png` : `${id}.pdf`,
    fileKind === 'image' ? 'image/png' : 'application/pdf'
  ),
  fileName: fileKind === 'image' ? `${id}.png` : `${id}.pdf`,
  fileTypeLabel: fileKind === 'image' ? 'PNG' : 'PDF',
  fileKind,
  mimeType: fileKind === 'image' ? 'image/png' : 'application/pdf',
  previewUrl: null,
  pdfCoverUrl: null,
  pdfPageCount: null,
});

describe('chat composer send plan helpers', () => {
  it('keeps remote image attachments unchanged', () => {
    const remoteImage: AttachmentComposerRemoteFile = {
      file: file('photo.png', 'image/png'),
      fileKind: 'image',
      sourceUrl: 'https://example.test/photo.png',
    };

    expect(buildRemoteComposerAttachment(remoteImage)).toBe(remoteImage);
  });

  it('converts remote document attachments into pending document sendables', () => {
    const remoteDocument: AttachmentComposerRemoteFile = {
      file: file('invoice.pdf', 'application/pdf'),
      fileKind: 'document',
      sourceUrl: 'https://example.test/invoice.pdf',
    };

    const result = buildRemoteComposerAttachment(remoteDocument);

    expect(result).toMatchObject({
      file: remoteDocument.file,
      fileName: 'invoice.pdf',
      fileTypeLabel: 'PDF',
      fileKind: 'document',
      mimeType: 'application/pdf',
      pdfCoverUrl: null,
      pdfPageCount: null,
    });
    expect('sourceUrl' in result).toBe(false);
  });

  it('attaches a caption only to the final pending attachment job', () => {
    const firstAttachment = pendingAttachment('first');
    const secondAttachment = pendingAttachment('second');

    expect(
      buildPendingAttachmentSendPlan(
        [firstAttachment, secondAttachment],
        'caption'
      )
    ).toEqual({
      shouldAttachCaption: true,
      jobs: [
        { attachment: firstAttachment, captionText: undefined },
        { attachment: secondAttachment, captionText: 'caption' },
      ],
    });
  });

  it('does not attach blank captions', () => {
    const attachment = pendingAttachment('first');

    expect(buildPendingAttachmentSendPlan([attachment], '   ')).toEqual({
      shouldAttachCaption: false,
      jobs: [{ attachment, captionText: undefined }],
    });
  });

  it('preappends optimistic batches only for multiple images', () => {
    expect(
      shouldPreappendBulkImageOptimisticBatch([
        pendingAttachment('first'),
        pendingAttachment('second'),
      ])
    ).toBe(true);
    expect(
      shouldPreappendBulkImageOptimisticBatch([pendingAttachment('first')])
    ).toBe(false);
    expect(
      shouldPreappendBulkImageOptimisticBatch([
        pendingAttachment('first'),
        pendingAttachment('document', 'document'),
      ])
    ).toBe(false);
  });
});
