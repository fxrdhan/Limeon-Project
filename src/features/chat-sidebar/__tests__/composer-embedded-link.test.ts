import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  extractEmbeddedComposerLinkFromMessageText,
  fetchEmbeddedComposerRemoteFile,
} from '../utils/composer-embedded-link';

const { mockRemoteAssetService } = vi.hoisted(() => ({
  mockRemoteAssetService: {
    fetchRemoteAsset: vi.fn(),
  },
}));

vi.mock('@/services/api/chat/remote-asset.service', () => ({
  chatRemoteAssetService: mockRemoteAssetService,
}));

describe('composer-embedded-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes chat shared links as embedded asset candidates', () => {
    expect(
      extractEmbeddedComposerLinkFromMessageText(
        'https://shrtlink.works/bwdrrk3ugm'
      )
    ).toEqual({
      source: 'direct-url',
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

    const result = await fetchEmbeddedComposerRemoteFile(
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
});
