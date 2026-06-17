import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useChatComposerAttachments } from '../hooks/useChatComposerAttachments';

type ComposerPasteEvent = Parameters<
  ReturnType<typeof useChatComposerAttachments>['handleComposerPaste']
>[0];

const createFileInputChangeEvent = (
  files: File[]
): ChangeEvent<HTMLInputElement> => {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  input.value = '';

  return {
    currentTarget: input,
    target: input,
  } as ChangeEvent<HTMLInputElement>;
};

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
const { mockFetchAttachmentComposerRemoteFile } = vi.hoisted(() => ({
  mockFetchAttachmentComposerRemoteFile: vi.fn(),
}));
const { mockValidateAttachmentComposerLink } = vi.hoisted(() => ({
  mockValidateAttachmentComposerLink: vi.fn(),
}));
const { mockCompressImageIfNeeded } = vi.hoisted(() => ({
  mockCompressImageIfNeeded: vi.fn(),
}));
const { mockRenderPdfPreviewDataUrl } = vi.hoisted(() => ({
  mockRenderPdfPreviewDataUrl: vi.fn(),
}));
const { mockChatSidebarAttachmentGateway, mockChatSidebarShareGateway } =
  vi.hoisted(() => ({
    mockChatSidebarAttachmentGateway: {
      compressPdf: vi.fn(),
    },
    mockChatSidebarShareGateway: {
      createSharedLink: vi.fn(),
      buildShortUrl: vi.fn(
        (slug: string) => `https://shrtlink.works/${slug.trim()}`
      ),
    },
  }));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarAttachmentGateway: mockChatSidebarAttachmentGateway,
  chatSidebarShareGateway: mockChatSidebarShareGateway,
}));

vi.mock('@/utils/image', () => ({
  compressImageIfNeeded: mockCompressImageIfNeeded,
}));

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewDataUrl: mockRenderPdfPreviewDataUrl,
}));

vi.mock('../utils/composer-attachment-link', async () => {
  const actual = await vi.importActual('../utils/composer-attachment-link');

  return {
    ...actual,
    fetchAttachmentComposerRemoteFile: mockFetchAttachmentComposerRemoteFile,
    validateAttachmentComposerLink: mockValidateAttachmentComposerLink,
  };
});

const buildComposerPasteEvent = ({
  html = '',
  text = '',
  textareaValue = '',
  selectionStart = textareaValue.length,
  selectionEnd = selectionStart,
  preventDefault = vi.fn(),
}: {
  html?: string;
  text?: string;
  textareaValue?: string;
  selectionStart?: number;
  selectionEnd?: number;
  preventDefault?: () => void;
}): ComposerPasteEvent => {
  const textarea = document.createElement('textarea');
  textarea.value = textareaValue;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;
  return {
    preventDefault: () => {
      preventDefault();
    },
    currentTarget: textarea,
    clipboardData: {
      items: [],
      getData: (format: string) => {
        if (format === 'text/html') return html;
        if (format === 'text/plain') return text;
        return '';
      },
    },
  } satisfies ComposerPasteEvent;
};

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

describe('useChatComposerAttachments', () => {
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    vi.stubGlobal('open', vi.fn());
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
    mockChatSidebarShareGateway.createSharedLink.mockResolvedValue({
      data: {
        slug: 'abc123xyzt',
        shortUrl: 'https://shrtlink.works/abc123xyzt',
        storagePath: 'images/channel/user-1_photo.png',
      },
      error: null,
    });
    mockFetchAttachmentComposerRemoteFile.mockResolvedValue(null);
    mockValidateAttachmentComposerLink.mockResolvedValue(true);
    mockCompressImageIfNeeded.mockImplementation(async (file: File) => file);
    mockRenderPdfPreviewDataUrl.mockResolvedValue(null);
    mockChatSidebarAttachmentGateway.compressPdf.mockResolvedValue({
      data: {
        file: new File(['compressed-pdf'], 'stok-kompres.pdf', {
          type: 'application/pdf',
        }),
        originalSize: 4096,
        compressedSize: 2048,
      },
      error: null,
    });
  });

  it('revokes queued attachment preview urls on unmount', () => {
    const { result, unmount } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

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
    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    const restoredAttachment = {
      id: 'pending-image-1',
      file: new File(['image'], 'foto.png', { type: 'image/png' }),
      fileName: 'foto.png',
      fileTypeLabel: 'PNG',
      fileKind: 'image' as const,
      mimeType: 'image/png',
      previewUrl: 'blob:stale-preview',
      pdfCoverUrl: null,
      pdfPageCount: null,
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

  it('cancels pending textarea focus when queued attachments are cleared', () => {
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      queuedFrames.delete(frameId);
    });
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const flushQueuedFrames = () => {
      const frames = Array.from(queuedFrames.entries());
      queuedFrames.clear();

      for (const [frameId, callback] of frames) {
        callback(frameId);
      }
    };

    try {
      const focus = vi.fn();
      const setSelectionRange = vi.fn();
      const messageInput = document.createElement('textarea');
      messageInput.value = 'draft';
      messageInput.focus = focus;
      messageInput.setSelectionRange = setSelectionRange;
      const messageInputRef = { current: messageInput };

      const { result } = renderHook(() => {
        const [message, setMessage] = useState('');

        return useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef,
          message,
          setMessage,
        });
      });

      act(() => {
        result.current.queueComposerImage(
          new File(['image'], 'foto.png', { type: 'image/png' })
        );
      });

      const focusFrameId = nextFrameId - 1;
      expect(queuedFrames.has(focusFrameId)).toBe(true);

      act(() => {
        result.current.clearPendingComposerAttachments();
      });

      expect(cancelAnimationFrameMock).toHaveBeenCalledWith(focusFrameId);

      act(() => {
        flushQueuedFrames();
      });

      expect(focus).not.toHaveBeenCalled();
      expect(setSelectionRange).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('cancels pending prompt focus when the channel changes', () => {
    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      queuedFrames.delete(frameId);
    });
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const flushQueuedFrames = () => {
      const frames = Array.from(queuedFrames.entries());
      queuedFrames.clear();

      for (const [frameId, callback] of frames) {
        callback(frameId);
      }
    };

    try {
      const focus = vi.fn();
      const setSelectionRange = vi.fn();
      const messageInput = document.createElement('textarea');
      messageInput.value = 'https://example.com/file.png';
      messageInput.focus = focus;
      messageInput.setSelectionRange = setSelectionRange;
      const messageInputRef = { current: messageInput };

      const { result, rerender } = renderHook(
        ({ channelId }: { channelId: string }) => {
          const [message, setMessage] = useState(
            'https://example.com/file.png'
          );

          return useChatComposerAttachments({
            currentChannelId: channelId,
            editingMessageId: null,
            closeMessageMenu: vi.fn(),
            messageInputRef,
            message,
            setMessage,
          });
        },
        {
          initialProps: { channelId: 'channel-1' },
        }
      );

      act(() => {
        result.current.handleEditAttachmentLink({
          id: 'candidate-1',
          pastedText: 'https://example.com/file.png',
          rangeEnd: 'https://example.com/file.png'.length,
          rangeStart: 0,
          url: 'https://example.com/file.png',
        });
      });

      const focusFrameId = nextFrameId - 1;
      expect(queuedFrames.has(focusFrameId)).toBe(true);

      act(() => {
        rerender({ channelId: 'channel-2' });
      });

      expect(cancelAnimationFrameMock).toHaveBeenCalledWith(focusFrameId);

      act(() => {
        flushQueuedFrames();
      });

      expect(focus).not.toHaveBeenCalled();
      expect(setSelectionRange).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });

  it('compresses a pending image in place without adding a new attachment', async () => {
    const compressedFile = new File(['compressed-image'], 'foto-kecil.jpg', {
      type: 'image/jpeg',
    });
    mockCompressImageIfNeeded.mockResolvedValueOnce(compressedFile);
    const createObjectURLMock = vi.spyOn(URL, 'createObjectURL');
    createObjectURLMock
      .mockReturnValueOnce('blob:original-preview')
      .mockReturnValueOnce('blob:compressed-preview');

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.queueComposerImage(
        new File(['image'], 'foto-besar.png', { type: 'image/png' })
      );
    });

    await act(async () => {
      await result.current.compressPendingComposerImage(
        result.current.pendingComposerAttachments[0]!.id
      );
    });

    await waitFor(() => {
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]).toEqual(
        expect.objectContaining({
          file: compressedFile,
          fileName: 'foto-kecil.jpg',
          mimeType: 'image/jpeg',
        })
      );
    });

    expect(
      result.current.pendingComposerAttachments[0]?.previewUrl
    ).toBeTruthy();
    expect(createObjectURLMock).toHaveBeenCalledWith(compressedFile);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original-preview');
  });

  it('does not finish stale image compression after the attachment is removed', async () => {
    const compressedImage = createDeferred<File>();
    mockCompressImageIfNeeded.mockReturnValueOnce(compressedImage.promise);

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.queueComposerImage(
        new File(['image'], 'foto-besar.png', { type: 'image/png' })
      );
    });

    const attachmentId = result.current.pendingComposerAttachments[0]!.id;

    let compressionPromise = Promise.resolve(false);
    act(() => {
      compressionPromise =
        result.current.compressPendingComposerImage(attachmentId);
    });

    act(() => {
      result.current.removePendingComposerAttachment(attachmentId);
    });

    let didCompress = true;
    await act(async () => {
      compressedImage.resolve(
        new File(['compressed-image'], 'foto-kecil.jpg', {
          type: 'image/jpeg',
        })
      );
      didCompress = await compressionPromise;
      await Promise.resolve();
    });

    expect(didCompress).toBe(false);
    expect(result.current.pendingComposerAttachments).toEqual([]);
  });

  it('compresses a pending pdf in place while showing a loading placeholder', async () => {
    let resolveCompression:
      | ((value: {
          data: {
            file: File;
            originalSize: number;
            compressedSize: number;
          };
          error: null;
        }) => void)
      | undefined;
    mockChatSidebarAttachmentGateway.compressPdf.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveCompression = resolve;
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([
          new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
        ])
      );
    });

    const attachmentId = result.current.pendingComposerAttachments[0]!.id;

    let compressionPromise: Promise<boolean>;
    act(() => {
      compressionPromise =
        result.current.compressPendingComposerPdf(attachmentId);
    });

    await waitFor(() => {
      expect(result.current.composerAttachmentPreviewItems).toEqual([
        expect.objectContaining({
          fileName: 'stok.pdf',
          loadingKind: 'pdf-compression',
          loadingPhase: 'uploading',
          replaceAttachmentId: attachmentId,
          status: 'loading',
        }),
      ]);
      expect(result.current.isLoadingAttachmentComposerAttachments).toBe(true);
    });

    await act(async () => {
      resolveCompression?.({
        data: {
          file: new File(['compressed-pdf'], 'stok-kompres.pdf', {
            type: 'application/pdf',
          }),
          originalSize: 4096,
          compressedSize: 2048,
        },
        error: null,
      });
      await compressionPromise!;
    });

    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        id: attachmentId,
        fileName: 'stok-kompres.pdf',
        mimeType: 'application/pdf',
      }),
    ]);
    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
  });

  it('switches pdf compression loading placeholder to processing while the request is still pending', async () => {
    vi.useFakeTimers();
    let resolveCompression:
      | ((value: {
          data: {
            file: File;
            originalSize: number;
            compressedSize: number;
          };
          error: null;
        }) => void)
      | null = null;
    mockChatSidebarAttachmentGateway.compressPdf.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveCompression = resolve;
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([
          new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
        ])
      );
    });

    const attachmentId = result.current.pendingComposerAttachments[0]!.id;

    let compressionPromise: Promise<boolean>;
    act(() => {
      compressionPromise =
        result.current.compressPendingComposerPdf(attachmentId);
    });

    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        loadingKind: 'pdf-compression',
        loadingPhase: 'uploading',
        replaceAttachmentId: attachmentId,
        status: 'loading',
      }),
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        loadingKind: 'pdf-compression',
        loadingPhase: 'processing',
        replaceAttachmentId: attachmentId,
        status: 'loading',
      }),
    ]);

    await act(async () => {
      resolveCompression?.({
        data: {
          file: new File(['compressed-pdf'], 'stok-kompres.pdf', {
            type: 'application/pdf',
          }),
          originalSize: 4096,
          compressedSize: 2048,
        },
        error: null,
      });
      await vi.advanceTimersByTimeAsync(360);
      await compressionPromise!;
    });

    vi.useRealTimers();
  });

  it('rejects pdf compression when the file exceeds 50 mb', async () => {
    const oversizedPdf = new File(['pdf'], 'stok-besar.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedPdf, 'size', {
      configurable: true,
      value: 50 * 1024 * 1024 + 1,
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([oversizedPdf])
      );
    });

    await act(async () => {
      await result.current.compressPendingComposerPdf(
        result.current.pendingComposerAttachments[0]!.id
      );
    });

    expect(mockChatSidebarAttachmentGateway.compressPdf).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Ukuran PDF maksimal 50 MB untuk kompres',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        fileName: 'stok-besar.pdf',
      }),
    ]);
  });

  it('restores the original pdf attachment when compression fails', async () => {
    mockChatSidebarAttachmentGateway.compressPdf.mockResolvedValueOnce({
      data: null,
      error: {
        code: '502',
        details: '',
        hint: '',
        message: 'Vendor gagal mengompres PDF',
        name: 'PostgrestError',
      },
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([
          new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
        ])
      );
    });

    await act(async () => {
      await result.current.compressPendingComposerPdf(
        result.current.pendingComposerAttachments[0]!.id
      );
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Vendor gagal mengompres PDF',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        fileName: 'stok.pdf',
      }),
    ]);
  });

  it('restores the original pdf attachment when compression throws', async () => {
    mockChatSidebarAttachmentGateway.compressPdf.mockRejectedValueOnce(
      new Error('Koneksi kompres PDF gagal')
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([
          new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
        ])
      );
    });

    let didCompress = true;
    await act(async () => {
      didCompress = await result.current.compressPendingComposerPdf(
        result.current.pendingComposerAttachments[0]!.id
      );
    });

    expect(didCompress).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Koneksi kompres PDF gagal',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        fileName: 'stok.pdf',
      }),
    ]);
  });

  it('cancels an in-flight pdf compression and restores the raw attachment', async () => {
    let abortSignal: AbortSignal | undefined;
    mockChatSidebarAttachmentGateway.compressPdf.mockImplementationOnce(
      (_file: File, options?: { signal?: AbortSignal }) =>
        new Promise(resolve => {
          abortSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => {
            resolve({
              data: null,
              error: {
                code: 'ABORT_ERR',
                details: '',
                hint: '',
                message: 'The operation was aborted',
                name: 'PostgrestError',
              },
            });
          });
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: null },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange(
        createFileInputChangeEvent([
          new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
        ])
      );
    });

    const attachmentId = result.current.pendingComposerAttachments[0]!.id;

    let compressionPromise: Promise<boolean>;
    act(() => {
      compressionPromise =
        result.current.compressPendingComposerPdf(attachmentId);
    });

    await waitFor(() => {
      expect(result.current.composerAttachmentPreviewItems).toEqual([
        expect.objectContaining({
          loadingKind: 'pdf-compression',
          replaceAttachmentId: attachmentId,
          status: 'loading',
        }),
      ]);
    });

    const loadingAttachmentId =
      result.current.composerAttachmentPreviewItems[0]!.id;

    act(() => {
      result.current.cancelLoadingComposerAttachment(loadingAttachmentId);
    });

    await act(async () => {
      await compressionPromise!;
    });

    expect(abortSignal?.aborted).toBe(true);
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'The operation was aborted',
      expect.anything()
    );
    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        id: attachmentId,
        fileName: 'stok.pdf',
        mimeType: 'application/pdf',
      }),
    ]);
    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
  });

  it('pastes an attachment link as raw url first and waits for the user choice', async () => {
    const closeMessageMenu = vi.fn();
    const preventDefault = vi.fn();

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu,
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    const pasteEvent = buildComposerPasteEvent({
      html: '<img src="https://example.com/attachment/receipt" />',
      preventDefault,
    });

    act(() => {
      result.current.handleComposerPaste(pasteEvent);
    });

    await waitFor(() => {
      expect(result.current.message).toBe(
        'https://example.com/attachment/receipt'
      );
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://example.com/attachment/receipt'
      );
    });

    expect(mockValidateAttachmentComposerLink).not.toHaveBeenCalled();
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(result.current.pendingComposerAttachments).toEqual([]);
    expect(result.current.loadingComposerAttachments).toEqual([]);
    expect(mockFetchAttachmentComposerRemoteFile).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('keeps a pasted generic link as a plain composer link when background validation rejects attachment support', async () => {
    mockFetchAttachmentComposerRemoteFile.mockResolvedValueOnce(null);

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'github.com',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe('github.com');
    });

    await waitFor(() => {
      expect(mockFetchAttachmentComposerRemoteFile).toHaveBeenCalledWith(
        'https://github.com/'
      );
    });

    expect(result.current.hoverableAttachmentCandidates).toEqual([]);
    expect(result.current.hoverableAttachmentUrl).toBeNull();
  });

  it('promotes a pasted generic link into an attachment candidate after background validation succeeds', async () => {
    mockFetchAttachmentComposerRemoteFile.mockResolvedValueOnce({
      file: new File(['image'], 'github-preview.png', {
        type: 'image/png',
      }),
      fileKind: 'image',
      sourceUrl: 'https://github.com/',
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'github.com',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe('github.com');
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
      expect(result.current.hoverableAttachmentCandidates[0]).toEqual(
        expect.objectContaining({
          url: 'https://github.com/',
          pastedText: 'github.com',
          rangeStart: 0,
          rangeEnd: 10,
        })
      );
    });
  });

  it('reuses the background-fetched remote file when converting a generic pasted link into an attachment', async () => {
    mockFetchAttachmentComposerRemoteFile.mockResolvedValue({
      file: new File(['image'], 'github-preview.png', {
        type: 'image/png',
      }),
      fileKind: 'image',
      sourceUrl: 'https://github.com/',
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'github.com',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    await waitFor(() => {
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]).toEqual(
        expect.objectContaining({
          fileKind: 'image',
          fileName: 'github-preview.png',
          mimeType: 'image/png',
        })
      );
    });

    expect(mockFetchAttachmentComposerRemoteFile).toHaveBeenCalledTimes(1);
    expect(mockFetchAttachmentComposerRemoteFile).toHaveBeenCalledWith(
      'https://github.com/'
    );
  });

  it('keeps the pasted link as raw url when the user chooses URL', async () => {
    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        setMessage,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://example.com/attachment/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://example.com/attachment/receipt.png'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    expect(result.current.attachmentPastePromptUrl).toBe(
      'https://example.com/attachment/receipt.png'
    );

    act(() => {
      result.current.handleUseAttachmentPasteAsUrl();
    });

    expect(result.current.message).toBe(
      'https://example.com/attachment/receipt.png'
    );
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(result.current.rawAttachmentUrl).toBe(
      'https://example.com/attachment/receipt.png'
    );
    expect(result.current.pendingComposerAttachments).toEqual([]);
  });

  it('shows feedback when opening a pasted link from the popover is blocked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const messageInput = document.createElement('textarea');

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://example.com/attachment/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://example.com/attachment/receipt.png'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    messageInput.value = 'https://example.com/attachment/receipt.png';

    act(() => {
      result.current.handleOpenAttachmentPastePromptLink();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/attachment/receipt.png',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockToast.error).toHaveBeenCalledWith('Browser memblokir tab baru', {
      toasterId: 'chat-sidebar-toaster',
    });
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(messageInput.selectionStart).toBe(
      'https://example.com/attachment/receipt.png'.length
    );
    expect(messageInput.selectionEnd).toBe(
      'https://example.com/attachment/receipt.png'.length
    );
  });

  it('focuses a pasted link as editable plain text when requested', async () => {
    const messageInput = document.createElement('textarea');

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://example.com/attachment/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
    });

    messageInput.value = result.current.message;

    act(() => {
      result.current.handleEditAttachmentLink(
        result.current.hoverableAttachmentCandidates[0]!
      );
    });

    expect(result.current.rawAttachmentUrl).toBe(
      'https://example.com/attachment/receipt.png'
    );
    expect(messageInput.selectionStart).toBe(0);
    expect(messageInput.selectionEnd).toBe(
      'https://example.com/attachment/receipt.png'.length
    );
  });

  it('copies the prompt link to the clipboard without leaving the full link selected', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const messageInput = document.createElement('textarea');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: messageInput },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://example.com/attachment/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    messageInput.value = 'https://example.com/attachment/receipt.png';

    await act(async () => {
      await result.current.handleCopyAttachmentPastePromptLink();
    });

    expect(writeText).toHaveBeenCalledWith(
      'https://example.com/attachment/receipt.png'
    );
    expect(mockToast.success).toHaveBeenCalledWith('Link berhasil disalin', {
      toasterId: 'chat-sidebar-toaster',
    });
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(messageInput.selectionStart).toBe(
      'https://example.com/attachment/receipt.png'.length
    );
    expect(messageInput.selectionEnd).toBe(
      'https://example.com/attachment/receipt.png'.length
    );
  });

  it('copies a generic composer link prompt without marking it as a raw attachment url', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const messageInput = document.createElement('textarea');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('github.com');

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: messageInput },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.openComposerLinkPrompt({
        url: 'https://github.com/',
        pastedText: 'github.com',
        rangeStart: 0,
        rangeEnd: 10,
      });
    });

    messageInput.value = 'github.com';

    await act(async () => {
      await result.current.handleCopyAttachmentPastePromptLink();
    });

    expect(writeText).toHaveBeenCalledWith('https://github.com/');
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(result.current.rawAttachmentUrl).toBeNull();
    expect(messageInput.selectionStart).toBe(10);
    expect(messageInput.selectionEnd).toBe(10);
  });

  it('does not finish a stale prompt copy after the channel changes', async () => {
    let resolveCopy: (() => void) | undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveCopy = resolve;
        })
    );
    const messageInput = document.createElement('textarea');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const [message, setMessage] = useState('github.com');

        return useChatComposerAttachments({
          currentChannelId: channelId,
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.openComposerLinkPrompt({
        url: 'https://github.com/',
        pastedText: 'github.com',
        rangeStart: 0,
        rangeEnd: 10,
      });
    });

    messageInput.value = 'github.com';
    messageInput.selectionStart = 0;
    messageInput.selectionEnd = 0;

    let copyPromise = Promise.resolve();
    act(() => {
      copyPromise = result.current.handleCopyAttachmentPastePromptLink();
    });

    act(() => {
      rerender({ channelId: 'channel-2' });
    });

    await act(async () => {
      resolveCopy?.();
      await copyPromise;
    });

    expect(writeText).toHaveBeenCalledWith('https://github.com/');
    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(mockToast.success).not.toHaveBeenCalledWith(
      'Link berhasil disalin',
      expect.anything()
    );
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal menyalin link',
      expect.anything()
    );
    expect(messageInput.selectionStart).toBe(0);
    expect(messageInput.selectionEnd).toBe(0);
  });

  it('shortens a direct chat asset link inside the composer prompt', async () => {
    const messageInput = document.createElement('textarea');
    const assetUrl =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';

    const { result } = renderHook(() => {
      const [message, setMessage] = useState(assetUrl);

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.openComposerLinkPrompt({
        url: assetUrl,
        pastedText: assetUrl,
        rangeStart: 0,
        rangeEnd: assetUrl.length,
      });
    });

    expect(result.current.isAttachmentPastePromptShortenable).toBe(true);
    messageInput.value = assetUrl;

    await act(async () => {
      await result.current.handleShortenAttachmentPastePromptLink();
    });

    await waitFor(() => {
      expect(result.current.attachmentPastePromptUrl).toBeNull();
      expect(result.current.rawAttachmentUrl).toBeNull();
      expect(result.current.message).toBe('https://shrtlink.works/abc123xyzt');
    });

    expect(mockChatSidebarShareGateway.createSharedLink).toHaveBeenCalledWith({
      storagePath: 'images/channel/user-1_photo.png',
    });
    expect(result.current.hoverableAttachmentCandidates).toEqual([]);
    expect(messageInput.selectionStart).toBe(
      'https://shrtlink.works/abc123xyzt'.length
    );
    expect(messageInput.selectionEnd).toBe(
      'https://shrtlink.works/abc123xyzt'.length
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Link berhasil dipendekkan',
      {
        toasterId: 'chat-sidebar-toaster',
      }
    );
  });

  it('does not shorten a stale composer prompt after the channel changes', async () => {
    const messageInput = document.createElement('textarea');
    const assetUrl =
      'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc';
    let resolveSharedLink:
      | ((value: {
          data: {
            slug: string;
            shortUrl: string;
            storagePath: string;
          };
          error: null;
        }) => void)
      | undefined;

    mockChatSidebarShareGateway.createSharedLink.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveSharedLink = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const [message, setMessage] = useState(assetUrl);

        return {
          message,
          ...useChatComposerAttachments({
            currentChannelId: channelId,
            editingMessageId: null,
            closeMessageMenu: vi.fn(),
            messageInputRef: { current: messageInput },
            message,
            setMessage,
          }),
        };
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.openComposerLinkPrompt({
        url: assetUrl,
        pastedText: assetUrl,
        rangeStart: 0,
        rangeEnd: assetUrl.length,
      });
    });

    let shortenPromise = Promise.resolve();
    act(() => {
      shortenPromise = result.current.handleShortenAttachmentPastePromptLink();
    });

    act(() => {
      rerender({ channelId: 'channel-2' });
    });

    await act(async () => {
      resolveSharedLink?.({
        data: {
          slug: 'abc123xyzt',
          shortUrl: 'https://shrtlink.works/abc123xyzt',
          storagePath: 'images/channel/user-1_photo.png',
        },
        error: null,
      });
      await shortenPromise;
    });

    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(result.current.message).toBe(assetUrl);
    expect(mockToast.success).not.toHaveBeenCalledWith(
      'Link berhasil dipendekkan',
      expect.anything()
    );
  });

  it('keeps shared links promptable as attachment candidates without offering shorten action', () => {
    const messageInput = document.createElement('textarea');
    const shortUrl = 'https://shrtlink.works/bwdrrk3ugm';

    const { result } = renderHook(() => {
      const [message, setMessage] = useState(shortUrl);

      return useChatComposerAttachments({
        editingMessageId: null,
        closeMessageMenu: vi.fn(),
        messageInputRef: { current: messageInput },
        message,
        setMessage,
      });
    });

    act(() => {
      result.current.openComposerLinkPrompt({
        url: shortUrl,
        pastedText: shortUrl,
        rangeStart: 0,
        rangeEnd: shortUrl.length,
      });
    });

    expect(result.current.isAttachmentPastePromptAttachmentCandidate).toBe(
      true
    );
    expect(result.current.isAttachmentPastePromptShortenable).toBe(false);
  });

  it('does not shorten a generic external link', async () => {
    const messageInput = document.createElement('textarea');
    const genericUrl =
      'https://www.kaggle.com/datasets/grandmaster07/student-exam-performance-dataset-analysis/data';

    const { result } = renderHook(() => {
      const [message, setMessage] = useState(genericUrl);

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.openComposerLinkPrompt({
        url: genericUrl,
        pastedText: genericUrl,
        rangeStart: 0,
        rangeEnd: genericUrl.length,
      });
    });

    expect(result.current.isAttachmentPastePromptShortenable).toBe(false);

    await act(async () => {
      await result.current.handleShortenAttachmentPastePromptLink();
    });

    expect(mockChatSidebarShareGateway.createSharedLink).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Hanya link attachment chat yang bisa dipendekkan',
      {
        toasterId: 'chat-sidebar-toaster',
      }
    );
    expect(result.current.message).toBe(genericUrl);
  });

  it('uses a collapsed selection when the composer provides a clicked caret position', async () => {
    const messageInput = document.createElement('textarea');

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: messageInput },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://example.com/attachment/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
    });

    messageInput.value = result.current.message;

    act(() => {
      result.current.handleEditAttachmentLink(
        result.current.hoverableAttachmentCandidates[0]!,
        {
          selectionStart: 8,
          selectionEnd: 8,
        }
      );
    });

    expect(result.current.rawAttachmentUrl).toBe(
      'https://example.com/attachment/receipt.png'
    );
    expect(messageInput.selectionStart).toBe(8);
    expect(messageInput.selectionEnd).toBe(8);
  });

  it('queues a pasted direct image url as an attachment after the user chooses Attachment', async () => {
    let resolveRemoteAsset:
      | ((value: { file: File; fileKind: 'image'; sourceUrl: string }) => void)
      | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        setMessage,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe(
        'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
      );
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    expect(result.current.attachmentPastePromptUrl).toBe(
      'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
    );

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    expect(result.current.attachmentPastePromptUrl).toBeNull();
    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'Ubuntu-25.10-Questing-Quokka.jpg',
        status: 'loading',
      }),
    ]);
    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(true);
    expect(result.current.message).toBe('');
    expect(result.current.hoverableAttachmentCandidates).toHaveLength(0);

    await act(async () => {
      resolveRemoteAsset?.({
        file: new File(['image'], 'Ubuntu-25.10-Questing-Quokka.jpg', {
          type: 'image/jpeg',
        }),
        fileKind: 'image',
        sourceUrl:
          'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg',
      });
      await Promise.resolve();
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
      expect(result.current.message).toBe('');
    });
  });

  it('queues a pasted google drive pdf url as a document after the user chooses Attachment', async () => {
    let resolveRemoteAsset:
      | ((value: {
          file: File;
          fileKind: 'document';
          sourceUrl: string;
        }) => void)
      | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    expect(result.current.attachmentPastePromptUrl).toBe(
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
    );

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'view',
        status: 'loading',
      }),
    ]);
    expect(result.current.pendingComposerAttachments).toHaveLength(0);
    expect(result.current.message).toBe('');
    expect(result.current.hoverableAttachmentCandidates).toHaveLength(0);

    await act(async () => {
      resolveRemoteAsset?.({
        file: new File(['pdf'], 'invoice.pdf', {
          type: 'application/pdf',
        }),
        fileKind: 'document',
        sourceUrl:
          'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]).toEqual(
        expect.objectContaining({
          fileKind: 'document',
          fileName: 'invoice.pdf',
          mimeType: 'application/pdf',
          previewUrl: null,
        })
      );
      expect(result.current.message).toBe('');
    });
  });

  it('restores the pasted link when loading the attachment from the url fails', async () => {
    let resolveRemoteAsset: ((value: null) => void) | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://shrtlink.works/bwdrrk3ugm',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://shrtlink.works/bwdrrk3ugm'
      );
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'bwdrrk3ugm',
        status: 'loading',
      }),
    ]);
    expect(result.current.message).toBe('');
    expect(result.current.hoverableAttachmentCandidates).toHaveLength(0);

    await act(async () => {
      resolveRemoteAsset?.(null);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.loadingComposerAttachments).toHaveLength(0);
      expect(result.current.message).toBe('https://shrtlink.works/bwdrrk3ugm');
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://shrtlink.works/bwdrrk3ugm'
      );
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Link harus mengarah ke gambar atau PDF yang valid',
      {
        toasterId: 'chat-sidebar-toaster',
      }
    );
  });

  it('does not restore a pasted attachment link after the channel changes while loading it', async () => {
    let resolveRemoteAsset: ((value: null) => void) | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const pastedLink = 'https://shrtlink.works/bwdrrk3ugm';
    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const [message, setMessage] = useState('');

        return {
          message,
          ...useChatComposerAttachments({
            currentChannelId: channelId,
            editingMessageId: null,
            closeMessageMenu: vi.fn(),
            messageInputRef: { current: null },
            message,
            setMessage,
          }),
        };
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: pastedLink,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(pastedLink);
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    expect(result.current.message).toBe('');
    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'bwdrrk3ugm',
        status: 'loading',
      }),
    ]);

    act(() => {
      rerender({ channelId: 'channel-2' });
    });

    await waitFor(() => {
      expect(result.current.loadingComposerAttachments).toHaveLength(0);
    });

    await act(async () => {
      resolveRemoteAsset?.(null);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.message).toBe('');
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(0);
      expect(result.current.loadingComposerAttachments).toHaveLength(0);
    });
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Link harus mengarah ke gambar atau PDF yang valid',
      expect.anything()
    );
  });

  it('does not show a stale fetch error after cancelling a loading attachment link', async () => {
    let rejectRemoteAsset: ((error: Error) => void) | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRemoteAsset = reject;
        })
    );

    const pastedLink = 'https://shrtlink.works/bwdrrk3ugm';
    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: pastedLink,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentUrl).toBe(pastedLink);
    });

    act(() => {
      result.current.openAttachmentPastePrompt();
    });

    act(() => {
      result.current.handleUseAttachmentPasteAsAttachment();
    });

    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'bwdrrk3ugm',
        status: 'loading',
      }),
    ]);
    expect(result.current.message).toBe('');

    const loadingAttachmentId =
      result.current.loadingComposerAttachments[0]!.id;
    act(() => {
      result.current.cancelLoadingComposerAttachment(loadingAttachmentId);
    });

    expect(result.current.loadingComposerAttachments).toHaveLength(0);

    await act(async () => {
      rejectRemoteAsset?.(new Error('network failed'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.message).toBe(pastedLink);
      expect(result.current.loadingComposerAttachments).toHaveLength(0);
    });

    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal mengambil file dari link',
      expect.anything()
    );
  });

  it('treats a pasted chat shared link as an attachment link candidate', async () => {
    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: 'https://shrtlink.works/bwdrrk3ugm',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe('https://shrtlink.works/bwdrrk3ugm');
      expect(result.current.hoverableAttachmentUrl).toBe(
        'https://shrtlink.works/bwdrrk3ugm'
      );
    });
  });

  it('tracks multiple pasted attachment links in the same draft', async () => {
    const firstLink = 'https://shrtlink.works/bwdrrk3ugm';
    const secondLink =
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing';
    const separator = ' dan ';
    let setMessageRef: Dispatch<SetStateAction<string>> | null = null;

    const { result } = renderHook(() => {
      const [message, setMessage] = useState('');
      setMessageRef = setMessage;

      return {
        message,
        ...useChatComposerAttachments({
          editingMessageId: null,
          closeMessageMenu: vi.fn(),
          messageInputRef: { current: null },
          message,
          setMessage,
        }),
      };
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: firstLink,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe(firstLink);
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(1);
    });

    act(() => {
      setMessageRef?.(`${result.current.message}${separator}`);
    });

    act(() => {
      result.current.handleComposerPaste(
        buildComposerPasteEvent({
          text: secondLink,
          textareaValue: `${firstLink}${separator}`,
          selectionStart: `${firstLink}${separator}`.length,
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableAttachmentCandidates).toHaveLength(2);
      expect(result.current.hoverableAttachmentUrl).toBeNull();
      expect(
        result.current.hoverableAttachmentCandidates.map(candidate => ({
          url: candidate.url,
          rangeStart: candidate.rangeStart,
        }))
      ).toEqual([
        {
          url: firstLink,
          rangeStart: 0,
        },
        {
          url: secondLink,
          rangeStart: `${firstLink}${separator}`.length,
        },
      ]);
    });
  });
});
