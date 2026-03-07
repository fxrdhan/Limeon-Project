import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatComposerAttachments } from '../hooks/useChatComposerAttachments';

describe('useChatComposerAttachments', () => {
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn() as typeof cancelAnimationFrame
    );
    revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:queued-image-preview'),
        revokeObjectURL,
      })
    );
  });

  it('revokes queued attachment preview urls on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
      })
    );

    act(() => {
      result.current.queueComposerImage(
        new File(['image'], 'foto.png', { type: 'image/png' })
      );
    });

    expect(result.current.pendingComposerAttachments).toHaveLength(1);

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:queued-image-preview');
  });

  it('rebuilds image previews when restoring pending attachments', () => {
    const { result } = renderHook(() =>
      useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
      })
    );

    const restoredAttachment = {
      id: 'pending-image-1',
      file: new File(['image'], 'foto.png', { type: 'image/png' }),
      fileName: 'foto.png',
      fileTypeLabel: 'PNG',
      fileKind: 'image' as const,
      mimeType: 'image/png',
      previewUrl: 'blob:stale-preview',
      pdfCoverUrl: null,
    };

    act(() => {
      result.current.restorePendingComposerAttachments([restoredAttachment]);
    });

    expect(result.current.pendingComposerAttachments).toHaveLength(1);
    expect(result.current.pendingComposerAttachments[0]).toEqual(
      expect.objectContaining({
        id: 'pending-image-1',
        fileName: 'foto.png',
        previewUrl: 'blob:queued-image-preview',
      })
    );
  });
});
