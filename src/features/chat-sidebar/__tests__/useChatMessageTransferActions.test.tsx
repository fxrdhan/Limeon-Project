import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatMessageTransferActions } from '../hooks/useChatMessageTransferActions';

const { mockToast, mockGateway } = vi.hoisted(() => ({
  mockToast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    promise: vi.fn(),
  },
  mockGateway: {
    downloadFile: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: {
    downloadAsset: mockGateway.downloadFile,
    createSignedAssetUrl: vi.fn(),
  },
}));

const createDownloadAnchor = (
  createAnchor: () => HTMLAnchorElement,
  click: () => void = vi.fn(),
  remove: () => void = vi.fn()
) => {
  const anchor = createAnchor();
  Object.defineProperty(anchor, 'click', {
    configurable: true,
    value: click,
  });
  Object.defineProperty(anchor, 'remove', {
    configurable: true,
    value: remove,
  });

  return anchor;
};

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(promiseResolve => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'https://example.com/stok.pdf',
  message_type: overrides.message_type ?? 'file',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name ?? 'stok.pdf',
  file_kind: overrides.file_kind ?? 'document',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_size: overrides.file_size ?? 1024,
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/stok.pdf',
  file_preview_url: overrides.file_preview_url ?? null,
  file_preview_page_count: overrides.file_preview_page_count ?? null,
  file_preview_status: overrides.file_preview_status ?? null,
  file_preview_error: overrides.file_preview_error ?? null,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('useChatMessageTransferActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('copies file messages as labeled attachment text instead of the raw url only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const closeMessageMenu = vi.fn();

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'file',
          message: 'https://example.com/storage/stok.pdf',
          file_name: 'stok.pdf',
        })
      );
    });

    expect(writeText).toHaveBeenCalledWith('[File: stok.pdf]');
    expect(mockToast.success).toHaveBeenCalledWith(
      'Lampiran berhasil disalin',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('downloads attachments through the storage fallback when direct fetch fails', async () => {
    const closeMessageMenu = vi.fn();
    const downloadBlob = new Blob(['stok'], { type: 'application/pdf' });
    const anchorClick = vi.fn();
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          createdDownloadLink = createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement,
            anchorClick
          );

          return createdDownloadLink;
        }

        return originalCreateElement(tagName);
      });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('fetch failed'))
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:download'),
        revokeObjectURL,
      })
    );
    mockGateway.downloadFile.mockResolvedValue(downloadBlob);

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadMessage(
        buildMessage({
          message:
            'https://example.com/storage/v1/object/sign/chat/documents/channel/stok.pdf?token=123',
          file_storage_path: 'documents/channel/stok.pdf',
        })
      );
    });

    expect(mockGateway.downloadFile).toHaveBeenCalledWith(
      'documents/channel/stok.pdf'
    );
    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      'stok.pdf'
    );
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('cleans up a prepared download when the browser rejects the click', async () => {
    vi.useFakeTimers();
    const closeMessageMenu = vi.fn();
    const downloadBlob = new Blob(['stok'], { type: 'application/pdf' });
    const anchorClick = vi.fn(() => {
      throw new Error('download blocked');
    });
    const anchorRemove = vi.fn();
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          createdDownloadLink = createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement,
            anchorClick,
            anchorRemove
          );

          return createdDownloadLink;
        }

        return originalCreateElement(tagName);
      });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => downloadBlob,
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:download'),
        revokeObjectURL,
      })
    );

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadMessage(
        buildMessage({
          message: 'https://example.com/storage/stok.pdf',
          file_storage_path: null,
        })
      );
    });

    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      'stok.pdf'
    );
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(anchorRemove).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('downloads grouped image bubbles as a zip archive', async () => {
    const closeMessageMenu = vi.fn();
    const imageBlobA = new Blob(['image-a'], { type: 'image/png' });
    const imageBlobB = new Blob(['image-b'], { type: 'image/png' });
    const anchorClick = vi.fn();
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          createdDownloadLink = createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement,
            anchorClick
          );

          return createdDownloadLink;
        }

        return originalCreateElement(tagName);
      });
    const createObjectURL = vi.fn().mockReturnValue('blob:group-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL,
        revokeObjectURL,
      })
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => imageBlobA,
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => imageBlobB,
        })
    );

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadImageGroup([
        buildMessage({
          id: 'image-1',
          message_type: 'image',
          message: 'https://example.com/image-a.png',
          file_name: 'foto.png',
          file_mime_type: 'image/png',
          file_storage_path: 'images/channel/foto.png',
        }),
        buildMessage({
          id: 'image-2',
          message_type: 'image',
          message: 'https://example.com/image-b.png',
          file_name: 'foto.png',
          file_mime_type: 'image/png',
          file_storage_path: 'images/channel/foto-copy.png',
        }),
      ]);
    });

    expect(anchorClick).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
    expect(mockToast.loading).toHaveBeenCalledWith(
      'Menyiapkan arsip gambar...',
      expect.objectContaining({
        id: 'chat-download-image-group-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Unduhan ZIP dimulai',
      expect.objectContaining({
        id: 'chat-download-image-group-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );

    const zipBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(0);

    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      'ZIP_260306093000.zip'
    );

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('downloads grouped document bubbles as a zip archive', async () => {
    const closeMessageMenu = vi.fn();
    const fileBlobA = new Blob(['pdf-a'], { type: 'application/pdf' });
    const fileBlobB = new Blob(['docx-b'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          createdDownloadLink = createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement
          );

          return createdDownloadLink;
        }

        return originalCreateElement(tagName);
      });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => fileBlobA,
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => fileBlobB,
        })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:group-download'),
        revokeObjectURL: vi.fn(),
      })
    );

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadDocumentGroup([
        buildMessage({
          id: 'file-1',
          message_type: 'file',
          message: 'https://example.com/report.pdf',
          file_name: 'report.pdf',
          file_mime_type: 'application/pdf',
          file_storage_path: 'documents/channel/report.pdf',
        }),
        buildMessage({
          id: 'file-2',
          message_type: 'file',
          message: 'https://example.com/notes.docx',
          file_name: 'notes.docx',
          file_mime_type:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_storage_path: 'documents/channel/notes.docx',
        }),
      ]);
    });

    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      'ZIP_260306093000.zip'
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('does not start a stale download after the transfer reset key changes', async () => {
    const closeMessageMenu = vi.fn();
    const downloadBlob = new Blob(['stok'], { type: 'application/pdf' });
    const deferredDownloadBlob = createDeferred<Blob>();
    const anchorClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          return createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement,
            anchorClick
          );
        }

        return originalCreateElement(tagName);
      });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => await deferredDownloadBlob.promise,
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:download'),
        revokeObjectURL: vi.fn(),
      })
    );

    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string | null }) =>
        useChatMessageTransferActions({
          closeMessageMenu,
          resetKey,
        }),
      {
        initialProps: {
          resetKey: 'channel-1',
        },
      }
    );

    let downloadPromise!: Promise<void>;
    act(() => {
      downloadPromise = result.current.handleDownloadMessage(
        buildMessage({
          message: 'https://example.com/storage/stok.pdf',
          file_storage_path: null,
        })
      );
    });

    expect(mockToast.loading).toHaveBeenCalledWith(
      'Menyiapkan unduhan...',
      expect.objectContaining({
        id: 'chat-download-message-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );

    act(() => {
      rerender({
        resetKey: 'channel-2',
      });
    });

    await act(async () => {
      deferredDownloadBlob.resolve(downloadBlob);
      await downloadPromise;
    });

    expect(mockToast.dismiss).toHaveBeenCalledWith('chat-download-message-1');
    expect(anchorClick).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalledWith(
      'Unduhan dimulai',
      expect.anything()
    );
    expect(mockToast.error).not.toHaveBeenCalledWith(
      'Gagal mengunduh file',
      expect.anything()
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('uses IMG-prefixed names when downloading a single image message', async () => {
    const closeMessageMenu = vi.fn();
    const imageBlob = new Blob(['image'], { type: 'image/png' });
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          createdDownloadLink = createDownloadAnchor(
            () => originalCreateElement('a') as HTMLAnchorElement
          );

          return createdDownloadLink;
        }

        return originalCreateElement(tagName);
      });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => imageBlob,
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:download'),
        revokeObjectURL: vi.fn(),
      })
    );

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadMessage(
        buildMessage({
          message_type: 'image',
          message: 'https://example.com/storage/image.png',
          file_name: 'stok.png',
        })
      );
    });

    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      'IMG_260306093000.png'
    );

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('copies image messages through the storage fallback when direct fetch fails', async () => {
    const closeMessageMenu = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    const imageBlob = new Blob(['image'], { type: 'image/png' });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        static supports = vi.fn().mockReturnValue(true);

        constructor(public items: Record<string, Blob>) {}
      }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('fetch failed'))
    );
    mockGateway.downloadFile.mockResolvedValue(imageBlob);

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'image',
          message:
            'https://example.com/storage/v1/object/sign/chat/images/channel/stok.png?token=123',
          file_name: 'stok.png',
          file_mime_type: 'image/png',
          file_storage_path: 'images/channel/stok.png',
        })
      );
    });

    expect(mockGateway.downloadFile).toHaveBeenCalledWith(
      'images/channel/stok.png'
    );
    expect(mockToast.loading).toHaveBeenCalledWith(
      'Menyalin gambar...',
      expect.objectContaining({
        id: 'chat-copy-image-message-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Gambar berhasil disalin',
      expect.objectContaining({
        id: 'chat-copy-image-message-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(write).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('copies image messages through storage download when the message only stores a raw storage path', async () => {
    const closeMessageMenu = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    const imageBlob = new Blob(['image'], { type: 'image/png' });
    const fetchSpy = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        static supports = vi.fn().mockReturnValue(true);

        constructor(public items: Record<string, Blob>) {}
      }
    );
    vi.stubGlobal('fetch', fetchSpy);
    mockGateway.downloadFile.mockResolvedValue(imageBlob);

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'image',
          message: 'images/channel/stok.png',
          file_name: 'stok.png',
          file_mime_type: 'image/png',
          file_storage_path: 'images/channel/stok.png',
        })
      );
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockGateway.downloadFile).toHaveBeenCalledWith(
      'images/channel/stok.png'
    );
    expect(write).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });

  it('normalizes copied image payloads to PNG before writing to the clipboard', async () => {
    const closeMessageMenu = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    const originalCreateElement = document.createElement.bind(document);
    const drawImage = vi.fn();
    const createdClipboardItems: Array<Record<string, Blob>> = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        static supports = vi.fn().mockReturnValue(true);

        constructor(public items: Record<string, Blob>) {
          createdClipboardItems.push(items);
        }
      }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }),
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:source-image'),
        revokeObjectURL: vi.fn(),
      })
    );
    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        naturalWidth = 12;
        naturalHeight = 8;
        width = 12;
        height = 8;

        set src(_value: string) {
          queueMicrotask(() => {
            this.onload?.();
          });
        }
      }
    );
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement('canvas');
          Object.defineProperty(canvas, 'getContext', {
            configurable: true,
            value: vi.fn().mockReturnValue({ drawImage }),
          });
          Object.defineProperty(canvas, 'toBlob', {
            configurable: true,
            value: (callback: BlobCallback) => {
              callback(new Blob(['png'], { type: 'image/png' }));
            },
          });

          return canvas;
        }

        return originalCreateElement(tagName);
      });

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'image',
          message: 'https://example.com/storage/image.jpg',
          file_name: 'image.jpg',
          file_mime_type: 'image/jpeg',
          file_storage_path: 'images/channel/image.jpg',
        })
      );
    });

    expect(write).toHaveBeenCalledOnce();
    expect(createdClipboardItems).toHaveLength(1);
    expect(Object.keys(createdClipboardItems[0] ?? {})).toEqual(['image/png']);
    expect(drawImage).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
  });

  it('falls back to the source image mime type when png conversion fails', async () => {
    const closeMessageMenu = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    const createdClipboardItems: Array<Record<string, Blob>> = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        static supports = vi.fn(
          (mimeType: string) =>
            mimeType === 'image/png' || mimeType === 'image/webp'
        );

        constructor(public items: Record<string, Blob>) {
          createdClipboardItems.push(items);
        }
      }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['webp'], { type: 'image/webp' }),
      })
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:source-image'),
        revokeObjectURL: vi.fn(),
      })
    );
    vi.stubGlobal(
      'Image',
      class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() => {
            this.onerror?.();
          });
        }
      }
    );

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'image',
          message: 'https://example.com/storage/image.webp',
          file_name: 'image.webp',
          file_mime_type: 'image/webp',
          file_storage_path: 'images/channel/image.webp',
        })
      );
    });

    expect(write).toHaveBeenCalledOnce();
    expect(createdClipboardItems).toHaveLength(1);
    expect(Object.keys(createdClipboardItems[0] ?? {})).toEqual(['image/webp']);
    expect(mockToast.loading).toHaveBeenCalledWith(
      'Menyalin gambar...',
      expect.objectContaining({
        id: 'chat-copy-image-message-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Gambar berhasil disalin',
      expect.objectContaining({
        id: 'chat-copy-image-message-1',
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });
});
