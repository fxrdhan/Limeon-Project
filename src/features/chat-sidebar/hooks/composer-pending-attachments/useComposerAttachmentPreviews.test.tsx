import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { PendingComposerAttachment } from '../../types';
import { useComposerAttachmentPreviews } from './useComposerAttachmentPreviews';

const { createImagePreviewBlobMock } = vi.hoisted(() => ({
  createImagePreviewBlobMock: vi.fn(),
}));

vi.mock('../../utils/image-message-preview', () => ({
  createImagePreviewBlob: createImagePreviewBlobMock,
}));

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const createImageAttachment = (): PendingComposerAttachment => ({
  id: 'pending-image-1',
  file: new File(['image'], 'foto.png', { type: 'image/png' }),
  fileName: 'foto.png',
  fileTypeLabel: 'PNG',
  fileKind: 'image',
  mimeType: 'image/png',
  previewUrl: null,
  pdfCoverUrl: null,
  pdfPageCount: null,
});

const StrictModeWrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe('useComposerAttachmentPreviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not create stale image preview object urls after unmount', async () => {
    const previewBlob = createDeferred<Blob | null>();
    createImagePreviewBlobMock.mockReturnValue(previewBlob.promise);
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:late-preview');

    const { unmount } = renderHook(() => {
      const [pendingComposerAttachments, setPendingComposerAttachments] =
        useState<PendingComposerAttachment[]>([createImageAttachment()]);
      const pendingComposerAttachmentsRef = useRef(pendingComposerAttachments);

      useEffect(() => {
        pendingComposerAttachmentsRef.current = pendingComposerAttachments;
      }, [pendingComposerAttachments]);

      return useComposerAttachmentPreviews({
        pendingComposerAttachments,
        pendingComposerAttachmentsRef,
        setPendingComposerAttachments,
      });
    });

    unmount();

    await act(async () => {
      previewBlob.resolve(new Blob(['preview'], { type: 'image/webp' }));
      await previewBlob.promise;
      await Promise.resolve();
    });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('continues creating image preview object urls after StrictMode effect replay', async () => {
    createImagePreviewBlobMock.mockResolvedValue(
      new Blob(['preview'], { type: 'image/webp' })
    );
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:strict-preview');

    renderHook(
      () => {
        const [pendingComposerAttachments, setPendingComposerAttachments] =
          useState<PendingComposerAttachment[]>([createImageAttachment()]);
        const pendingComposerAttachmentsRef = useRef(
          pendingComposerAttachments
        );

        useEffect(() => {
          pendingComposerAttachmentsRef.current = pendingComposerAttachments;
        }, [pendingComposerAttachments]);

        return useComposerAttachmentPreviews({
          pendingComposerAttachments,
          pendingComposerAttachmentsRef,
          setPendingComposerAttachments,
        });
      },
      {
        wrapper: StrictModeWrapper,
      }
    );

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
    });
  });
});
