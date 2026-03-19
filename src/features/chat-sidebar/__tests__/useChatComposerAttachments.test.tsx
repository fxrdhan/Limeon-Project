import { act, renderHook, waitFor } from '@testing-library/react';
import type {
  ClipboardEvent as ReactClipboardEvent,
  Dispatch,
  SetStateAction,
} from 'react';
import { useState } from 'react';
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
const { mockFetchEmbeddedComposerRemoteFile } = vi.hoisted(() => ({
  mockFetchEmbeddedComposerRemoteFile: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

vi.mock('../utils/composer-embedded-link', async () => {
  const actual = await vi.importActual('../utils/composer-embedded-link');

  return {
    ...actual,
    fetchEmbeddedComposerRemoteFile: mockFetchEmbeddedComposerRemoteFile,
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
  preventDefault?: ReturnType<typeof vi.fn>;
}) => {
  const textarea = document.createElement('textarea');
  textarea.value = textareaValue;
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionEnd;

  return {
    preventDefault,
    currentTarget: textarea,
    clipboardData: {
      items: [],
      getData: (format: string) => {
        if (format === 'text/html') return html;
        if (format === 'text/plain') return text;
        return '';
      },
    },
  } as unknown as ReactClipboardEvent<HTMLTextAreaElement>;
};

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
    mockFetchEmbeddedComposerRemoteFile.mockResolvedValue(null);
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

  it('pastes an embedded link as raw url first and waits for the user choice', async () => {
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
      html: '<img src="https://example.com/embed/receipt" />',
      preventDefault,
    });

    act(() => {
      result.current.handleComposerPaste(pasteEvent);
    });

    await waitFor(() => {
      expect(result.current.message).toBe('https://example.com/embed/receipt');
      expect(result.current.hoverableEmbeddedLinkUrl).toBe(
        'https://example.com/embed/receipt'
      );
    });

    expect(result.current.embeddedLinkPastePromptUrl).toBeNull();
    expect(result.current.pendingComposerAttachments).toEqual([]);
    expect(result.current.loadingComposerAttachments).toEqual([]);
    expect(mockFetchEmbeddedComposerRemoteFile).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();
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
          text: 'https://example.com/embed/receipt.png',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.hoverableEmbeddedLinkUrl).toBe(
        'https://example.com/embed/receipt.png'
      );
    });

    act(() => {
      result.current.openEmbeddedLinkPastePrompt();
    });

    expect(result.current.embeddedLinkPastePromptUrl).toBe(
      'https://example.com/embed/receipt.png'
    );

    act(() => {
      result.current.handleUseEmbeddedLinkPasteAsUrl();
    });

    expect(result.current.message).toBe(
      'https://example.com/embed/receipt.png'
    );
    expect(result.current.embeddedLinkPastePromptUrl).toBeNull();
    expect(result.current.rawEmbeddedLinkUrl).toBe(
      'https://example.com/embed/receipt.png'
    );
    expect(result.current.pendingComposerAttachments).toEqual([]);
  });

  it('queues a pasted direct image url as an attachment after the user chooses Embed', async () => {
    let resolveRemoteAsset:
      | ((value: { file: File; fileKind: 'image'; sourceUrl: string }) => void)
      | undefined;
    mockFetchEmbeddedComposerRemoteFile.mockImplementation(
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
      expect(result.current.hoverableEmbeddedLinkUrl).toBe(
        'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
      );
    });

    act(() => {
      result.current.openEmbeddedLinkPastePrompt();
    });

    expect(result.current.embeddedLinkPastePromptUrl).toBe(
      'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
    );

    act(() => {
      result.current.handleUseEmbeddedLinkPasteAsEmbed();
    });

    expect(result.current.embeddedLinkPastePromptUrl).toBeNull();
    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'Ubuntu-25.10-Questing-Quokka.jpg',
        status: 'loading',
      }),
    ]);
    expect(result.current.isLoadingEmbeddedComposerAttachments).toBe(true);
    expect(result.current.message).toBe(
      'https://betanews.com/wp-content/uploads/2025/10/Ubuntu-25.10-Questing-Quokka.jpg'
    );

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

  it('queues a pasted google drive pdf url as a document after the user chooses Embed', async () => {
    let resolveRemoteAsset:
      | ((value: {
          file: File;
          fileKind: 'document';
          sourceUrl: string;
        }) => void)
      | undefined;
    mockFetchEmbeddedComposerRemoteFile.mockImplementation(
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
      expect(result.current.hoverableEmbeddedLinkUrl).toBe(
        'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
      );
    });

    act(() => {
      result.current.openEmbeddedLinkPastePrompt();
    });

    expect(result.current.embeddedLinkPastePromptUrl).toBe(
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
    );

    act(() => {
      result.current.handleUseEmbeddedLinkPasteAsEmbed();
    });

    expect(result.current.loadingComposerAttachments).toEqual([
      expect.objectContaining({
        fileName: 'view',
        status: 'loading',
      }),
    ]);
    expect(result.current.pendingComposerAttachments).toHaveLength(0);

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

  it('treats a pasted chat shared link as an embedded link candidate', async () => {
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
      expect(result.current.hoverableEmbeddedLinkUrl).toBe(
        'https://shrtlink.works/bwdrrk3ugm'
      );
    });
  });

  it('tracks multiple pasted embedded links in the same draft', async () => {
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
      expect(result.current.hoverableEmbeddedLinkCandidates).toHaveLength(1);
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
      expect(result.current.hoverableEmbeddedLinkCandidates).toHaveLength(2);
      expect(result.current.hoverableEmbeddedLinkUrl).toBeNull();
      expect(
        result.current.hoverableEmbeddedLinkCandidates.map(candidate => ({
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
