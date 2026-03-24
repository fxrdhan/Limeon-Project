import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import {
  extractAttachmentComposerLinkFromMessageText,
  extractComposerLinkFromClipboard,
  fetchAttachmentComposerRemoteFile,
  isChatSharedLinkUrl,
} from '../utils/composer-attachment-link';

const { mockRemoteAssetService } = vi.hoisted(() => ({
  mockRemoteAssetService: {
    fetchRemoteAsset: vi.fn(),
  },
}));
const { mockShareGateway } = vi.hoisted(() => ({
  mockShareGateway: {
    buildShortUrl: vi.fn(
      (slug: string) =>
        `https://example.com/functions/v1/chat-link/${slug.trim().replace(/^\/+/, '')}`
    ),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarAttachmentGateway: mockRemoteAssetService,
  chatSidebarShareGateway: mockShareGateway,
}));

vi.mock('@/services/api/chat/link.service', () => {
  return {
    buildChatSharedLinkShortUrl: (slug: string) =>
      `https://example.com/functions/v1/chat-link/${slug.trim().replace(/^\/+/, '')}`,
  };
});

describe('composer-attachment-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognizes chat shared links as attachment asset candidates', () => {
    expect(
      extractAttachmentComposerLinkFromMessageText(
        'https://shrtlink.works/bwdrrk3ugm'
      )
    ).toEqual({
      source: 'direct-url',
      url: 'https://shrtlink.works/bwdrrk3ugm',
    });
  });

  it('does not treat same-host storage asset urls as shared links', () => {
    expect(
      isChatSharedLinkUrl(
        'https://example.com/functions/v1/chat-link/bwdrrk3ugm'
      )
    ).toBe(true);
    expect(
      isChatSharedLinkUrl(
        'https://example.com/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc'
      )
    ).toBe(false);
  });

  it('keeps visible HTML anchor text when pasting a shared attachment link', () => {
    expect(
      extractComposerLinkFromClipboard({
        text: '',
        html: '<a href="https://shrtlink.works/bwdrrk3ugm">github.com</a>',
      })
    ).toEqual({
      source: 'attachment',
      pastedText: 'github.com',
      url: 'https://shrtlink.works/bwdrrk3ugm',
    });
  });

  it('keeps visible HTML anchor text when DOMParser is unavailable', () => {
    vi.stubGlobal('DOMParser', undefined);

    expect(
      extractComposerLinkFromClipboard({
        text: '',
        html: '<a href="https://shrtlink.works/bwdrrk3ugm"><strong>github.com</strong></a>',
      })
    ).toEqual({
      source: 'attachment',
      pastedText: 'github.com',
      url: 'https://shrtlink.works/bwdrrk3ugm',
    });
  });

  it('infers google drive pdf files from binary responses without filename headers', async () => {
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(['%PDF-1.4\n1 0 obj\n<</Title (Job Desk Minggu 4)>>'], {
          type: 'application/octet-stream',
        }),
        contentDisposition: null,
        contentType: 'application/octet-stream',
        sourceUrl:
          'https://drive.usercontent.google.com/download?id=113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH&export=download',
      },
      error: null,
    });

    const result = await fetchAttachmentComposerRemoteFile(
      'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing'
    );

    expect(mockRemoteAssetService.fetchRemoteAsset).toHaveBeenCalledWith(
      'https://drive.google.com/uc?export=download&id=113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH',
      {
        fileNameSourceUrl:
          'https://drive.google.com/file/d/113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH/view?usp=sharing',
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        fileKind: 'document',
        sourceUrl:
          'https://drive.usercontent.google.com/download?id=113Z7cPJCdAwGg8emnZfw0aCix4YeS_lH&export=download',
      })
    );
    expect(result?.file.type).toBe('application/pdf');
    expect(result?.file.name).toBe('Job Desk Minggu 4.pdf');
  });

  it('infers chat shared image files from binary responses without exposed metadata headers', async () => {
    mockRemoteAssetService.fetchRemoteAsset.mockResolvedValue({
      data: {
        blob: new Blob(
          [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
          {
            type: 'application/octet-stream',
          }
        ),
        contentDisposition: null,
        contentType: 'application/octet-stream',
        sourceUrl: 'https://shrtlink.works/bwdrrk3ugm',
        fileNameHint: null,
      },
      error: null,
    });

    const result = await fetchAttachmentComposerRemoteFile(
      'https://shrtlink.works/bwdrrk3ugm'
    );

    expect(result).toEqual(
      expect.objectContaining({
        fileKind: 'image',
        sourceUrl: 'https://shrtlink.works/bwdrrk3ugm',
      })
    );
    expect(result?.file.type).toBe('image/png');
    expect(result?.file.name).toBe('bwdrrk3ugm.png');
  });
});
