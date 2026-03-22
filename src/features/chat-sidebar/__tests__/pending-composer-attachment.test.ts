import { describe, expect, it } from 'vite-plus/test';
import { buildPendingFileComposerAttachment } from '../utils/pending-composer-attachment';

describe('pending-composer-attachment', () => {
  it('uses compact file type labels for office documents', () => {
    const docxFile = new File(['docx'], 'prosedur-praktikum.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const xlsxFile = new File(['xlsx'], 'stok-opname.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const docxAttachment = buildPendingFileComposerAttachment(
      docxFile,
      'document'
    );
    const xlsxAttachment = buildPendingFileComposerAttachment(
      xlsxFile,
      'document'
    );

    expect(docxAttachment.fileTypeLabel).toBe('DOCX');
    expect(xlsxAttachment.fileTypeLabel).toBe('XLSX');
  });
});
