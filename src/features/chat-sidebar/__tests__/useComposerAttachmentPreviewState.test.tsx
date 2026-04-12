import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { useComposerAttachmentPreviewState } from '../hooks/useComposerAttachmentPreviewState';
import type { PendingComposerAttachment } from '../types';

const buildAttachment = (
  overrides: Partial<PendingComposerAttachment> = {}
): PendingComposerAttachment => ({
  id: overrides.id ?? 'attachment-1',
  file:
    overrides.file ?? new File(['image'], 'diagram.png', { type: 'image/png' }),
  fileName: overrides.fileName ?? 'diagram.png',
  fileTypeLabel: overrides.fileTypeLabel ?? 'PNG',
  fileKind: overrides.fileKind ?? 'image',
  mimeType: overrides.mimeType ?? 'image/png',
  previewUrl: overrides.previewUrl ?? null,
  pdfCoverUrl: overrides.pdfCoverUrl ?? null,
  pdfPageCount: overrides.pdfPageCount ?? null,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useComposerAttachmentPreviewState', () => {
  it('opens composer image preview for a document attachment with an image mime type', () => {
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:expanded-preview');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useComposerAttachmentPreviewState({
        closeAttachModal: vi.fn(),
        closeMessageMenu: vi.fn(),
        pendingComposerAttachments: [
          buildAttachment({
            id: 'attachment-image-doc',
            fileKind: 'document',
            mimeType: 'image/png',
            previewUrl: null,
          }),
        ],
      })
    );

    act(() => {
      result.current.openComposerImagePreview('attachment-image-doc');
    });

    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(result.current.previewComposerImageAttachment?.id).toBe(
      'attachment-image-doc'
    );
    expect(result.current.isComposerImageExpanded).toBe(true);
    expect(result.current.composerImageExpandedUrl).toBe(
      'blob:expanded-preview'
    );

    act(() => {
      result.current.resetComposerImagePreviewState();
    });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:expanded-preview');
  });
});
