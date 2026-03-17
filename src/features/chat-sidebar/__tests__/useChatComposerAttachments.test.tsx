import { act, renderHook, waitFor } from '@testing-library/react';
import type { ClipboardEvent as ReactClipboardEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useChatComposerAttachments } from '../hooks/useChatComposerAttachments';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
const { mockRemoteAssetService } = vi.hoisted(() => ({
  mockRemoteAssetService: {
    fetchRemoteAsset: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

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
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: null,
      error: null,
    });
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

  it('converts pasted embedded image html into a queued image attachment', async () => {
    const closeMessageMenu = vi.fn();
    const preventDefault = vi.fn();
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['image'], { type: 'image/png' }),
        contentDisposition: null,
        contentType: 'image/png',
        sourceUrl: 'https://example.com/embed/receipt',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu,
        messageInputRef: { current: null },
      })
    );

    await act(async () => {
      result.current.handleComposerPaste({
        preventDefault,
        clipboardData: {
          items: [],
          getData: (format: string) =>
            format === 'text/html'
              ? '<img src="https://example.com/embed/receipt" />'
              : '',
        },
      } as unknown as ReactClipboardEvent<HTMLTextAreaElement>);
    });

    await waitFor(() => {
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]).toEqual(
        expect.objectContaining({
          fileKind: 'image',
          fileName: 'receipt.png',
          mimeType: 'image/png',
          previewUrl: 'blob:queued-image-preview',
        })
      );
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('converts a pasted direct image url into a queued image attachment', async () => {
    const closeMessageMenu = vi.fn();
    const preventDefault = vi.fn();
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['image'], { type: 'image/jpeg' }),
        contentDisposition: null,
        contentType: 'image/jpeg',
        sourceUrl:
          'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg',
      },
      error: null,
    });

    const { result } = renderHook(() =>
      useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu,
        messageInputRef: { current: null },
      })
    );

    await act(async () => {
      result.current.handleComposerPaste({
        preventDefault,
        clipboardData: {
          items: [],
          getData: (format: string) =>
            format === 'text/plain'
              ? 'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
              : '',
        },
      } as unknown as ReactClipboardEvent<HTMLTextAreaElement>);
    });

    await waitFor(() => {
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]).toEqual(
        expect.objectContaining({
          fileKind: 'image',
          fileName: 'Ubuntu-25.10-Questing-Quokka.jpg',
          mimeType: 'image/jpeg',
          previewUrl: 'blob:queued-image-preview',
        })
      );
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });
});
