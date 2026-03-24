import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatComposer } from '../hooks/useChatComposer';

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
const { mockFetchAttachmentComposerRemoteFile } = vi.hoisted(() => ({
  mockFetchAttachmentComposerRemoteFile: vi.fn(),
}));
const { mockValidateAttachmentComposerLink } = vi.hoisted(() => ({
  mockValidateAttachmentComposerLink: vi.fn(),
}));
const { mockRenderPdfPreviewDataUrl } = vi.hoisted(() => ({
  mockRenderPdfPreviewDataUrl: vi.fn(),
}));
const { mockChatPdfCompressService } = vi.hoisted(() => ({
  mockChatPdfCompressService: {
    compressPdf: vi.fn(),
  },
}));
const {
  mockComposerDraftPersistence,
  persistedComposerDraftMessages,
  persistedComposerDraftAttachments,
} = vi.hoisted(() => {
  const draftMessages = new Map<string, string>();
  const draftAttachments = new Map<string, Record<string, unknown>[]>();

  const normalizeChannelId = (channelId?: string | null) =>
    channelId?.trim() || '';
  const cloneAttachments = (attachments: Record<string, unknown>[]) =>
    attachments.map(attachment => ({
      ...attachment,
    }));

  return {
    persistedComposerDraftMessages: draftMessages,
    persistedComposerDraftAttachments: draftAttachments,
    mockComposerDraftPersistence: {
      readPersistedComposerDraftMessage: vi.fn((channelId?: string | null) => {
        return draftMessages.get(normalizeChannelId(channelId)) ?? '';
      }),
      writePersistedComposerDraftMessage: vi.fn(
        (channelId: string | null | undefined, message: string) => {
          const normalizedChannelId = normalizeChannelId(channelId);
          if (!normalizedChannelId) {
            return false;
          }

          if (message.length === 0) {
            draftMessages.delete(normalizedChannelId);
          } else {
            draftMessages.set(normalizedChannelId, message);
          }

          return true;
        }
      ),
      loadPersistedComposerDraftAttachments: vi.fn(
        async (channelId?: string | null) => {
          return cloneAttachments(
            draftAttachments.get(normalizeChannelId(channelId)) ?? []
          );
        }
      ),
      persistComposerDraftAttachments: vi.fn(
        async (
          channelId: string | null | undefined,
          attachments: Record<string, unknown>[]
        ) => {
          const normalizedChannelId = normalizeChannelId(channelId);
          if (!normalizedChannelId) {
            return;
          }

          if (attachments.length === 0) {
            draftAttachments.delete(normalizedChannelId);
            return;
          }

          draftAttachments.set(
            normalizedChannelId,
            cloneAttachments(attachments)
          );
        }
      ),
    },
  };
});

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

vi.mock('@/services/api/chat/pdf-compress.service', () => ({
  chatPdfCompressService: mockChatPdfCompressService,
}));

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewDataUrl: mockRenderPdfPreviewDataUrl,
}));

vi.mock('../utils/composer-draft-persistence', () => ({
  ...mockComposerDraftPersistence,
}));

vi.mock('../utils/composer-attachment-link', async () => {
  const actual = await vi.importActual('../utils/composer-attachment-link');

  return {
    ...actual,
    fetchAttachmentComposerRemoteFile: mockFetchAttachmentComposerRemoteFile,
    validateAttachmentComposerLink: mockValidateAttachmentComposerLink,
  };
});

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'stok awal',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('useChatComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistedComposerDraftMessages.clear();
    persistedComposerDraftAttachments.clear();
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
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:preview'),
        revokeObjectURL: vi.fn(),
      })
    );
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: null,
      error: null,
    });
    mockFetchAttachmentComposerRemoteFile.mockResolvedValue(null);
    mockValidateAttachmentComposerLink.mockResolvedValue(true);
    mockRenderPdfPreviewDataUrl.mockResolvedValue(null);
    mockChatPdfCompressService.compressPdf.mockResolvedValue({
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

  it('mereset state composer ketika berpindah ke channel lain', async () => {
    const closeMessageMenu = vi.fn();
    const currentMessage = buildMessage({
      id: 'message-1',
      message: 'draft edit',
    });

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: channelId,
          messages: [currentMessage],
          closeMessageMenu,
          messageInputRef,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    await act(async () => {
      result.current.setMessage('draft belum terkirim');
      result.current.queueComposerImage(
        new File(['image'], 'stok.png', { type: 'image/png' })
      );
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft belum terkirim');
      expect(result.current.editingMessageId).toBeNull();
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.message).toBe('');
      expect(result.current.editingMessageId).toBeNull();
      expect(result.current.pendingComposerAttachments).toHaveLength(0);
    });
  });

  it('tetap memulihkan draft text dan attachment meski composer dimuat ulang lebih dari sekali', async () => {
    const closeMessageMenu = vi.fn();
    const imageFile = new File(['image'], 'draft.png', {
      type: 'image/png',
    });

    const { result, unmount } = renderHook(() => {
      const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

      return useChatComposer({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        closeMessageMenu,
        messageInputRef,
      });
    });

    await act(async () => {
      result.current.setMessage('draft stok opname');
      result.current.queueComposerImage(imageFile);
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft stok opname');
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
    });

    unmount();

    const { result: restoredResult, unmount: unmountRestored } = renderHook(
      () => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: 'channel-1',
          messages: [],
          closeMessageMenu,
          messageInputRef,
        });
      }
    );

    await waitFor(() => {
      expect(restoredResult.current.message).toBe('draft stok opname');
      expect(restoredResult.current.pendingComposerAttachments).toHaveLength(1);
      expect(
        restoredResult.current.pendingComposerAttachments[0]?.fileName
      ).toBe('draft.png');
    });

    unmountRestored();

    const { result: restoredAgainResult } = renderHook(() => {
      const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

      return useChatComposer({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        closeMessageMenu,
        messageInputRef,
      });
    });

    await waitFor(() => {
      expect(restoredAgainResult.current.message).toBe('draft stok opname');
      expect(
        restoredAgainResult.current.pendingComposerAttachments
      ).toHaveLength(1);
      expect(
        restoredAgainResult.current.pendingComposerAttachments[0]?.fileName
      ).toBe('draft.png');
    });
  });

  it('tetap menampilkan aksi tempel sebagai untuk shared link setelah draft dipulihkan', async () => {
    const closeMessageMenu = vi.fn();
    const shortUrl = 'https://shrtlink.works/bwdrrk3ugm';
    persistedComposerDraftMessages.set('channel-1', shortUrl);

    const { result } = renderHook(() => {
      const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

      return useChatComposer({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        closeMessageMenu,
        messageInputRef,
      });
    });

    await waitFor(() => {
      expect(result.current.message).toBe(shortUrl);
    });

    act(() => {
      result.current.openComposerLinkPrompt({
        url: shortUrl,
        pastedText: shortUrl,
        rangeStart: 0,
        rangeEnd: shortUrl.length,
      });
    });

    expect(result.current.attachmentPastePromptUrl).toBe(shortUrl);
    expect(result.current.isAttachmentPastePromptAttachmentCandidate).toBe(
      true
    );
    expect(result.current.isAttachmentPastePromptShortenable).toBe(false);
  });

  it('memulihkan draft yang berbeda untuk tiap channel', async () => {
    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: channelId,
          messages: [],
          closeMessageMenu: vi.fn(),
          messageInputRef,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    await act(async () => {
      result.current.setMessage('draft channel satu');
      result.current.handleDocumentFileChange({
        target: {
          files: [
            new File(['pdf'], 'channel-satu.pdf', {
              type: 'application/pdf',
            }),
          ],
          value: '',
        },
      } as never);
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft channel satu');
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
    });

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.message).toBe('');
      expect(result.current.pendingComposerAttachments).toHaveLength(0);
    });

    await act(async () => {
      result.current.setMessage('draft channel dua');
    });

    await waitFor(() => {
      expect(result.current.message).toBe('draft channel dua');
    });

    rerender({ channelId: 'channel-1' });

    await waitFor(() => {
      expect(result.current.message).toBe('draft channel satu');
      expect(result.current.pendingComposerAttachments).toHaveLength(1);
      expect(result.current.pendingComposerAttachments[0]?.fileName).toBe(
        'channel-satu.pdf'
      );
    });
  });

  it('menghapus prompt paste dan loading attachment ketika channel berpindah saat konversi attachment masih berjalan', async () => {
    let resolveRemoteAsset:
      | ((value: { file: File; fileKind: 'image'; sourceUrl: string }) => void)
      | undefined;
    mockFetchAttachmentComposerRemoteFile.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRemoteAsset = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ channelId }: { channelId: string }) => {
        const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

        return useChatComposer({
          isOpen: true,
          currentChannelId: channelId,
          messages: [],
          closeMessageMenu: vi.fn(),
          messageInputRef,
        });
      },
      {
        initialProps: { channelId: 'channel-1' },
      }
    );

    act(() => {
      result.current.handleComposerPaste({
        preventDefault: vi.fn(),
        currentTarget: Object.assign(document.createElement('textarea'), {
          value: '',
          selectionStart: 0,
          selectionEnd: 0,
        }),
        clipboardData: {
          items: [],
          getData: (format: string) =>
            format === 'text/plain'
              ? 'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
              : '',
        },
      } as never);
    });

    await waitFor(() => {
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

    rerender({ channelId: 'channel-2' });

    await waitFor(() => {
      expect(result.current.loadingComposerAttachments).toEqual([]);
      expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
      expect(result.current.attachmentPastePromptUrl).toBeNull();
    });

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

    expect(result.current.pendingComposerAttachments).toEqual([]);
  });

  it('menonaktifkan kirim saat kompres pdf composer sedang berjalan', async () => {
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
    mockChatPdfCompressService.compressPdf.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveCompression = resolve;
        })
    );

    const { result } = renderHook(() => {
      const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

      return useChatComposer({
        isOpen: true,
        currentChannelId: 'channel-1',
        messages: [],
        closeMessageMenu: vi.fn(),
        messageInputRef,
      });
    });

    act(() => {
      result.current.handleDocumentFileChange({
        target: {
          files: [
            new File(['pdf'], 'stok.pdf', {
              type: 'application/pdf',
            }),
          ],
          value: '',
        },
      } as never);
    });

    let compressPromise: Promise<boolean>;
    act(() => {
      compressPromise = result.current.compressPendingComposerPdf(
        result.current.pendingComposerAttachments[0]!.id
      );
    });

    await waitFor(() => {
      expect(result.current.isLoadingAttachmentComposerAttachments).toBe(true);
      expect(result.current.composerAttachmentPreviewItems).toEqual([
        expect.objectContaining({
          fileName: 'stok.pdf',
          status: 'loading',
        }),
      ]);
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
      await compressPromise!;
    });

    expect(result.current.isLoadingAttachmentComposerAttachments).toBe(false);
    expect(result.current.composerAttachmentPreviewItems).toEqual([
      expect.objectContaining({
        fileName: 'stok-kompres.pdf',
      }),
    ]);
  });
});
