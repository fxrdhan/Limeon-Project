import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPdfBlobWithFallback } from '../utils/message-file';

const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    downloadStorageFile: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
}));

describe('message-file utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to the chat storage gateway when direct fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network failed')) as typeof fetch
    );
    mockGateway.downloadStorageFile.mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' })
    );

    const pdfBlob = await fetchPdfBlobWithFallback(
      'https://example.com/storage/v1/object/public/chat/documents/channel/stok.pdf?token=123'
    );

    expect(mockGateway.downloadStorageFile).toHaveBeenCalledWith(
      'chat',
      'documents/channel/stok.pdf'
    );
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob?.type).toBe('application/pdf');
  });
});
